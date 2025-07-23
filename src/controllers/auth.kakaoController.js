import axios from "axios";
import jwt from "jsonwebtoken";
import { PrismaClient, UserRole } from "@prisma/client";
import {
  KakaoLoginError,
  KakaoAlreadyLinkedError,
  KakaoCodeMissingError,
} from "../errors/customErrors.js";

const prisma = new PrismaClient();

export const handleKakaoRedirect = async (req, res, next) => {
  const code = req.query.code;
  const tokenFromQuery = req.query.state;

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
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const kakaoUser = userRes.data;
    const socialId = kakaoUser.id.toString();
    const email = kakaoUser.kakao_account?.email ?? null;
    const nickname = kakaoUser.properties?.nickname ?? "카카오유저";

    let loggedInUserId = null;
    if (tokenFromQuery) {
      try {
        const decoded = jwt.verify(tokenFromQuery, process.env.JWT_SECRET);
        loggedInUserId = decoded.userId;
      } catch (err) {
        console.warn("JWT 디코딩 실패:", err.message);
      }
    }

    const kakaoAccount = await prisma.kakaoAccount.findUnique({
      where: { socialId },
      include: { user: true },
    });

    if (kakaoAccount) {
      if (loggedInUserId && kakaoAccount.user.id !== Number(loggedInUserId)) {
        return next(new KakaoAlreadyLinkedError());
      }

      const user = kakaoAccount.user;
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      const redirectUrl = `${
        process.env.FRONT_LOGIN_SUCCESS_URI
      }?token=${token}&nickname=${encodeURIComponent(user.nickname)}`;
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

    const dummyPhone =
      "kakao_" +
      Math.floor(Math.random() * 1e10)
        .toString()
        .padStart(10, "0");
    const user = await prisma.user.create({
      data: {
        email,
        nickname,
        phoneNumber: dummyPhone,
        role: UserRole.CUSTOMER,
        allowKakaoAlert: false,
        status: "active",
        kakaoAccount: {
          create: { socialId },
        },
      },
    });

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
  const code = req.query.code;
  const userId = req.user?.id;

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
      return next(new KakaoAlreadyLinkedError());
    }

    await prisma.kakaoAccount.create({
      data: {
        userId,
        socialId,
      },
    });

    return res.redirect(`${process.env.FRONT_PROFILE_URI}?linked=kakao`);
  } catch (err) {
    return next(new KakaoLoginError(err.response?.data || err.message));
  }
};
