import bcrypt from 'bcrypt';
import prisma from '../../prisma/client.js';
import express from 'express';

export const signup = async (req, res, next) => {
  try {
    const {
      email,
      password,
      nickname,
      phone_number,
      agreements
    } = req.body;
    console.log('body:', req.body);


    // 중복 확인
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone_number: phone_number }
        ]
      }
    });

    if (existingUser) {
      return res.error({
        errorCode: 'USER_EXISTS',
        reason: '이미 가입된 이메일 또는 전화번호입니다.'
      });
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 유저 + 약관 트랜잭션 저장
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password_hash: hashedPassword,
          nickname,
          phone_number: phone_number,
          role: 'CUSTOMER',
          allow_kakao_alert: false,
          status: 'active'
        }
      });

      await tx.userAgreement.create({
        data: {
          user_id: createdUser.id,
          terms_agreed: agreements.terms_agreed,
          privacy_policy_agreed: agreements.privacy_policy_agreed,
          marketing_agreed: agreements.marketing_agreed,
          location_permission: agreements.location_permission
        }
      });

      return createdUser;
    });

    return res.success({
      message: '회원가입 성공',
      userId: user.id.toString(), 
      nickname: user.nickname
    });
  } catch (err) {
    next(err); // errorHandler에서 처리됨
  }
};