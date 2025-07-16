import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '@prisma/client';
/* 프론트는 아래처럼 리다이렉트
 -  연동 버튼 클릭 시
const jwt = localStorage.getItem('jwt'); // 사용자가 이미 로그인한 상태의 토큰

const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize` +
  `?response_type=code` +
  `&client_id=YOUR_KAKAO_REST_API_KEY` +
  `&redirect_uri=${encodeURIComponent(`http://localhost:3000/api/auth/kakao/redirect?token=${jwt}`)}`;

window.location.href = kakaoAuthUrl;
*/
const prisma = new PrismaClient();

export const handleKakaoRedirect = async (req, res) => {
  const code = req.query.code;
  const tokenFromQuery = req.query.state;

  if (!code) return res.status(400).send('Missing code');

  try {
    // 1. 카카오 토큰 발급
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

    // 2. 카카오 유저 정보 요청
    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const kakaoUser = userRes.data;
    const socialId = kakaoUser.id.toString();
    const email = kakaoUser.kakao_account?.email ?? null;
    const nickname = kakaoUser.properties?.nickname ?? '카카오유저';
    const tokenFromState = req.query.state;

    // 3. 이미 연결된 socialId인지 확인
    const kakaoAccount = await prisma.kakaoAccount.findUnique({
      where: { socialId },
      include: { user: true },
    });

    // 4. token이 쿼리로 넘어왔다면 → 연동 처리
    let loggedInUserId = null;
    
    if (tokenFromState) {
      try {
        const decoded = jwt.verify(tokenFromState, process.env.JWT_SECRET);
        loggedInUserId = decoded.userId;
      } catch (err) {
        console.warn('JWT 디코딩 실패:', err.message);
      }
    }

    if (kakaoAccount) {
      // 이미 존재하는 카카오 계정
      if (loggedInUserId && kakaoAccount.user.id !== Number(loggedInUserId)) {
        return res.status(409).json({ error: '이미 다른 계정에 연결된 카카오 계정입니다.' });
      }

      // 이미 연동된 사람 → 로그인 처리
      const user = kakaoAccount.user;
      const token = jwt.sign({ userId: user.id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const redirectUrl = `${process.env.FRONT_LOGIN_SUCCESS_URI}?token=${token}&nickname=${encodeURIComponent(user.nickname)}`;
      return res.redirect(redirectUrl);
    }

    if (loggedInUserId) {
      // 연동 처리
      await prisma.kakaoAccount.create({
        data: {
          userId: Number(loggedInUserId),
          socialId,
        },
      });

      return res.redirect(`${process.env.FRONT_PROFILE_URI}?linked=kakao`);
    }

    // 아무런 로그인 정보도 없고, 기존 연동도 없음 → 신규 가입
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

    const token = jwt.sign({ userId: user.id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const redirectUrl = `${process.env.FRONT_LOGIN_SUCCESS_URI}?token=${token}&nickname=${encodeURIComponent(user.nickname)}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('카카오 로그인 오류:', err.response?.data || err.message);
    return res.status(500).send('카카오 로그인 실패');
  }
};



export const handleKakaoLinkCallback = async (req, res) => {
  const code = req.query.code;
  const userId = req.user.id;

  if (!code) return res.status(400).send('Missing code');

  try {
    // 1. access_token 요청
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

    // 2. 사용자 정보 요청
    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const kakaoUser = userRes.data;
    const socialId = kakaoUser.id.toString();

    // 3. 이미 다른 사용자에게 연결된 socialId인지 확인
    const existingKakaoAccount = await prisma.kakaoAccount.findUnique({
      where: { socialId },
    });

    if (existingKakaoAccount) {
      return res.status(409).json({ error: '이미 다른 계정에 연결된 카카오 계정입니다.' });
    }

    // 4. 현재 로그인된 사용자에게 kakaoAccount 연결
    await prisma.kakaoAccount.create({
      data: {
        userId,
        socialId,
      },
    });

    return res.redirect(`${process.env.FRONT_PROFILE_URI}?linked=kakao`);
  } catch (err) {
    console.error('카카오 연동 오류:', err.response?.data || err.message);
    return res.status(500).send('카카오 연동 실패');
  }
};
