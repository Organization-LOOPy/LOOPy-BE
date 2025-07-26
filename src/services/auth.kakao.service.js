import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { KakaoAlreadyLinkedError, KakaoCodeMissingError,
  MissingRoleError, InvalidRoleError 
 } from '../errors/customErrors.js';

const prisma = new PrismaClient();

// 공통 util 함수
const buildRedirectUrl = (token, nickname) =>
  `${process.env.FRONT_LOGIN_SUCCESS_URI}?token=${token}&nickname=${encodeURIComponent(nickname.slice(0, 50))}`;

const createJwt = (userId, roles, currentRole) =>
  jwt.sign({ userId: userId.toString(), roles, currentRole }, process.env.JWT_SECRET, { expiresIn: '7d' });

// 카카오 소셜 로그인
export const handleKakaoRedirectService = async (code, tokenFromQuery, roleFromQuery) => {
  if (!code) throw new KakaoCodeMissingError();
  if (!roleFromQuery) throw new MissingRoleError();

  const requestedRole = roleFromQuery.toUpperCase();
  if (!['CUSTOMER', 'OWNER'].includes(requestedRole)) {
    throw new InvalidRoleError();
  }

  const redirectUri = `${process.env.KAKAO_REDIRECT_URI}?role=${roleFromQuery}`;

  const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token', null, {
    params: {
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_REST_API_KEY,
      redirect_uri: redirectUri,
      code,
    },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const accessToken = tokenRes.data.access_token;

  const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const kakaoUser = userRes.data;
  const socialId = kakaoUser.id.toString();
  const email = kakaoUser.kakao_account?.email ?? null;
  const nickname = kakaoUser.properties?.nickname ?? '카카오유저';

  let loggedInUserId = null;
  if (tokenFromQuery) {
    try {
      const decoded = jwt.verify(tokenFromQuery, process.env.JWT_SECRET);
      loggedInUserId = decoded.userId;
    } catch (err) {
      console.warn('JWT 디코딩 실패:', err.message);
    }
  }

  const kakaoAccount = await prisma.kakaoAccount.findUnique({
    where: { socialId },
    include: { user: true },
  });

  if (kakaoAccount) {
    const user = kakaoAccount.user;
    if (loggedInUserId && user.id !== Number(loggedInUserId)) {
      throw new KakaoAlreadyLinkedError();
    }

    const existingRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: true },
    });
    const roleList = existingRoles.map((r) => r.role);

    if (!roleList.includes(requestedRole)) {
      await prisma.userRole.create({ data: { userId: user.id, role: requestedRole } });
      roleList.push(requestedRole);
    }


    const token = createJwt(user.id, roleList, requestedRole);
    return { redirectUrl: buildRedirectUrl(token, user.nickname) };
  }

let dummyPhone, duplicate;
do {
  dummyPhone = 'kakao_' + Math.floor(Math.random() * 1e10).toString().padStart(10, '0');
  duplicate = await prisma.user.findUnique({ where: { phoneNumber: dummyPhone } });
} while (duplicate);

  const user = await prisma.user.create({
    data: {
      email,
      nickname,
      phoneNumber: dummyPhone,
      allowKakaoAlert: false,
      status: 'active',
      kakaoAccount: {
        create: { socialId },
      },
      userRole: {
        create: { role: requestedRole },
      },
    },
  });

  const token = createJwt(newUser.id, [requestedRole], requestedRole);
  return { redirectUrl: buildRedirectUrl(token, user.nickname) };
};

//클라이언트에 콜백 
export const handleKakaoLinkCallbackService = async (code, userId) => {
  if (!code) throw new KakaoCodeMissingError();

  const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token', null, {
    params: {
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_REST_API_KEY,
      redirect_uri: process.env.KAKAO_LINK_REDIRECT_URI,
      code,
    },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const accessToken = tokenRes.data.access_token;

  const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const kakaoUser = userRes.data;
  const socialId = kakaoUser.id.toString();

  const existing = await prisma.kakaoAccount.findUnique({
    where: { socialId },
  });

  if (existing) throw new KakaoAlreadyLinkedError();

  await prisma.kakaoAccount.create({
    data: {
      userId,
      socialId,
    },
  });

  return { redirectUrl: `${process.env.FRONT_PROFILE_URI}?linked=kakao` };
};
