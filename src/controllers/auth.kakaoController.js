import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export const handleKakaoRedirect = async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  try {
    // 1. access_token 요청
    console.log('[CALLBACK] 카카오 리다이렉트 진입');
    // res.send('카카오 리다이렉트 OK');
    const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_REST_API_KEY,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
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
    const email = kakaoUser.kakao_account?.email ?? null;
    const nickname = kakaoUser.properties?.nickname ?? '카카오유저';

    // 3. KakaoAccount 조회 또는 생성
    let user;
    const kakaoAccount = await prisma.kakaoAccount.findUnique({
      where: { socialId },
      include: { user: true },
    });

    if (kakaoAccount) {
      user = kakaoAccount.user;
    } else {
      // 더미 전화번호 생성 (나중에 입력받을 것)
      const dummyPhone = 'kakao_' + Math.floor(Math.random() * 1e10).toString().padStart(10, '0');

      user = await prisma.user.create({
        data: {
          email,
          nickname,
          phoneNumber: dummyPhone,
          role: UserRole.CUSTOMER,
          allowKakaoAlert: false,
          status: 'active',
          kakaoAccount: {
            create: {
              socialId,
            },
          },
        },
      });
    }

    // 4. 실제 사용자 기반 JWT 발급
    const token = jwt.sign({ userId: user.id.toString() }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // 5. 프론트로 리다이렉트
    const redirectUrl = `${process.env.FRONT_LOGIN_SUCCESS_URI}?token=${token}&nickname=${encodeURIComponent(user.nickname)}`;
    return res.redirect(redirectUrl);

  } catch (err) {
    console.error('카카오 로그인 오류:', err.response?.data || err.message);
    return res.status(500).send('카카오 로그인 실패');
  }
};