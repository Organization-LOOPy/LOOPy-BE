import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma/client.js';
import {
  DuplicateEmailError,
  MissingFieldsError,
  UserNotFoundError,
  InvalidPasswordError,
  BadRequestError,
} from '../errors/customErrors.js';

// 이메일 기반 회원가입 
export const signupService = async (body) => {
  const { email, password, nickname, phoneNumber, agreements } = body;

  if (!email || !password || !nickname || !phoneNumber) {
    throw new MissingFieldsError(['email', 'password', 'nickname', 'phoneNumber']);
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phoneNumber }],
    },
  });

  if (existingUser) {
    throw new DuplicateEmailError({ email, phoneNumber });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        nickname,
        phoneNumber,
        role: 'CUSTOMER',
        allowKakaoAlert: false,
        status: 'active',
      },
    });

    await tx.userAgreement.create({
      data: {
        userId: createdUser.id,
        termsAgreed: agreements.termsAgreed,
        privacyPolicyAgreed: agreements.privacyPolicyAgreed,
        marketingAgreed: agreements.marketingAgreed,
        locationPermission: agreements.locationPermission,
        agreedAt: new Date(),
      },
    });

    await tx.userPreference.create({
      data: { userId: createdUser.id },
    });

    return createdUser;
  });

  const token = jwt.sign(
    { userId: user.id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    message: '회원가입 성공',
    token,
    user: {
      id: user.id.toString(),
      email: user.email,
      nickname: user.nickname,
    },
  };
};

// 이메일 기반 로그인
export const loginService = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new UserNotFoundError(email);

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');
  if (!isPasswordValid) throw new InvalidPasswordError();

  const token = jwt.sign(
    { userId: user.id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    message: '로그인 성공',
    token,
    user: {
      id: user.id.toString(),
      email: user.email,
      nickname: user.nickname,
    },
  };
};

// 로그아웃 
export const logoutService = async (userId) => {
  if (!userId) throw new BadRequestError('로그인된 사용자만 로그아웃할 수 있습니다.');

  await prisma.user.update({
    where: { id: Number(userId) },
    data: { fcmToken: null },
  });

  return { message: '로그아웃 완료' };
};