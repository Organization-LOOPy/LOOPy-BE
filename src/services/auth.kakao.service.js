import axios from 'axios';
import jwt from 'jsonwebtoken';
import prismaPackage from '@prisma/client'; 
import { KakaoLoginError, KakaoAlreadyLinkedError, KakaoCodeMissingError } from '../errors/customErrors.js';

const { PrismaClient, UserRole } = prismaPackage;
const prisma = new PrismaClient();

// 카카오 소셜 로그인
export const handleKakaoRedirectService = async (code, tokenFromQuery) => {
  if (!code) throw new KakaoCodeMissingError();

  const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token', null, {
    params: {
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_REST_API_KEY,
      redirect_uri: `http://localhost:3000/api/auth/kakao/redirect`,
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
    if (loggedInUserId && kakaoAccount.user.id !== Number(loggedInUserId)) {
      throw new KakaoAlreadyLinkedError();
    }

    const user = kakaoAccount.user;
    const token = jwt.sign({ userId: user.id.toString() }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    const redirectUrl = `${process.env.FRONT_LOGIN_SUCCESS_URI}?token=${token}&nickname=${encodeURIComponent(user.nickname)}`;
    return { redirectUrl };
  }

  if (loggedInUserId) {
    await prisma.kakaoAccount.create({
      data: {
        userId: Number(loggedInUserId),
        socialId,
      },
    });

    return { redirectUrl: `${process.env.FRONT_PROFILE_URI}?linked=kakao` };
  }

  const dummyPhone = 'kakao_' + Math.floor(Math.random() * 1e10).toString().padStart(10, '0');
  const user = await prisma.user.create({
    data: {
      email,
      nickname,
      phoneNumber: dummyPhone,
      role: UserRole.CUSTOMER,
      allowKakaoAlert: false,
      status: 'active',
      kakaoAccount: {
        create: { socialId },
      },
    },
  });

  const token = jwt.sign({ userId: user.id.toString() }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  const redirectUrl = `${process.env.FRONT_LOGIN_SUCCESS_URI}?token=${token}&nickname=${encodeURIComponent(user.nickname)}`;
  return { redirectUrl };
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
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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
