<<<<<<< HEAD
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '@prisma/client';
/* 프론트는 아래처럼 리다이렉트
 -  연동 버튼 클릭 시
const jwt = localStorage.getItem('jwt'); // 사용자가 이미 로그인한 상태의 토큰
=======
import axios from "axios";
import jwt from "jsonwebtoken";
import { PrismaClient, UserRole } from "@prisma/client";
import {
  KakaoLoginError,
  KakaoAlreadyLinkedError,
  KakaoCodeMissingError,
} from "../errors/customErrors.js";
>>>>>>> origin/main

const prisma = new PrismaClient();

export const handleKakaoRedirect = async (req, res, next) => {
  const code = req.query.code;
  const tokenFromQuery = req.query.state;

<<<<<<< HEAD
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
=======
  if (!code) return next(new KakaoCodeMissingError());

  try {
    const tokenRes = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: process.env.KAKAO_REST_API_KEY,
          redirect_uri: `http://localhost:3000/api/auth/kakao/redirect`,
          code,
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get("https://kapi.kakao.com/v2/user/me", {
>>>>>>> origin/main
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const kakaoUser = userRes.data;
    const socialId = kakaoUser.id.toString();
    const email = kakaoUser.kakao_account?.email ?? null;
<<<<<<< HEAD
    const nickname = kakaoUser.properties?.nickname ?? '카카오유저';
    const tokenFromState = req.query.state;
=======
    const nickname = kakaoUser.properties?.nickname ?? "카카오유저";
>>>>>>> origin/main

    let loggedInUserId = null;
<<<<<<< HEAD
    
    if (tokenFromState) {
=======
    if (tokenFromQuery) {
>>>>>>> origin/main
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
<<<<<<< HEAD
        return res.status(409).json({ error: '이미 다른 계정에 연결된 카카오 계정입니다.' });
=======
        return next(new KakaoAlreadyLinkedError());
>>>>>>> origin/main
      }

      const user = kakaoAccount.user;
<<<<<<< HEAD
      const token = jwt.sign({ userId: user.id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const redirectUrl = `${process.env.FRONT_LOGIN_SUCCESS_URI}?token=${token}&nickname=${encodeURIComponent(user.nickname)}`;
=======
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      const redirectUrl = `${
        process.env.FRONT_LOGIN_SUCCESS_URI
      }?token=${token}&nickname=${encodeURIComponent(user.nickname)}`;
>>>>>>> origin/main
      return res.redirect(redirectUrl);
    }

    if (loggedInUserId) {
      await prisma.kakaoAccount.create({
        data: {
          userId: Number(loggedInUserId),
          socialId,
        },
      });

      return res.redirect(`${process.env.FRONT_PROFILE_URI}?linked=kakao`);
    }

<<<<<<< HEAD
    // 아무런 로그인 정보도 없고 기존 연동도 없으면 신규 가입으로 
    const dummyPhone = 'kakao_' + Math.floor(Math.random() * 1e10).toString().padStart(10, '0');
=======
    const dummyPhone =
      "kakao_" +
      Math.floor(Math.random() * 1e10)
        .toString()
        .padStart(10, "0");
>>>>>>> origin/main
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

<<<<<<< HEAD
    const token = jwt.sign({ userId: user.id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const redirectUrl = `${process.env.FRONT_LOGIN_SUCCESS_URI}?token=${token}&nickname=${encodeURIComponent(user.nickname)}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('카카오 로그인 오류:', err.response?.data || err.message);
    return res.status(500).send('카카오 로그인 실패');
  }
};



export const handleKakaoLinkCallback = async (req, res) => {
=======
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    const redirectUrl = `${
      process.env.FRONT_LOGIN_SUCCESS_URI
    }?token=${token}&nickname=${encodeURIComponent(user.nickname)}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    return next(new KakaoLoginError(err.response?.data || err.message));
  }
};

export const handleKakaoLinkCallback = async (req, res, next) => {
>>>>>>> origin/main
  const code = req.query.code;
  const userId = req.user?.id;

<<<<<<< HEAD
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
=======
  if (!code) return next(new KakaoCodeMissingError());

  try {
    const tokenRes = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: process.env.KAKAO_REST_API_KEY,
          redirect_uri: process.env.KAKAO_LINK_REDIRECT_URI,
          code,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get("https://kapi.kakao.com/v2/user/me", {
>>>>>>> origin/main
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const kakaoUser = userRes.data;
    const socialId = kakaoUser.id.toString();

    const existingKakaoAccount = await prisma.kakaoAccount.findUnique({
      where: { socialId },
    });

    if (existingKakaoAccount) {
<<<<<<< HEAD
      return res.status(409).json({ error: '이미 다른 계정에 연결된 카카오 계정입니다.' });
=======
      return next(new KakaoAlreadyLinkedError());
>>>>>>> origin/main
    }

    await prisma.kakaoAccount.create({
      data: {
        userId,
        socialId,
      },
    });

    return res.redirect(`${process.env.FRONT_PROFILE_URI}?linked=kakao`);
  } catch (err) {
<<<<<<< HEAD
    console.error('카카오 연동 오류:', err.response?.data || err.message);
    return res.status(500).send('카카오 연동 실패');
=======
    return next(new KakaoLoginError(err.response?.data || err.message));
>>>>>>> origin/main
  }
};
