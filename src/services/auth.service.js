import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../prisma/client.js";
import {
  DuplicateUserError,
  MissingFieldsError,
  EmailNotFoundError,
  InvalidPasswordError,
  BadRequestError,
  InvalidRoleError,
  RoleNotGrantedError,
} from "../errors/customErrors.js";
import { RoleType } from "../../prisma/client.js";
import { generateQRCode } from './user.service.js'; 

// 이메일 기반 회원가입
export const signupService = async (body) => {
  const { email, password, nickname, phoneNumber, agreements, role } = body;
  console.log('📌 signup req.body:', body);
  if (!password || !nickname ||  !role) {
    throw new MissingFieldsError([
      "password",
      "nickname",
      "role",
    ]);
  }

  if (!agreements?.termsAgreed || !agreements?.privacyPolicyAgreed || !agreements?.locationPermission) {
    throw new MissingFieldsError([
      'termsAgreed',
      'privacyPolicyAgreed',
      'locationPermission',
    ]);
  }

  if (!["CUSTOMER", "OWNER"].includes(role)) {
    throw new InvalidRoleError(role);
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phoneNumber }],
    },
  });

  if (existingUser) {
    throw new DuplicateUserError({ email, phoneNumber });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        nickname,
        phoneNumber,
        allowKakaoAlert: false,
        status: "active",
        qrCode: "",
      },
    });

    await tx.userAgreement.create({
      data: {
        userId: createdUser.id,
        termsAgreed: agreements.termsAgreed,
        privacyPolicyAgreed: agreements.privacyPolicyAgreed,
        marketingAgreed: agreements.marketingAgreed ?? false,
        locationPermission: agreements.locationPermission,
        agreedAt: new Date(),
      },
    });

    await tx.userPreference.create({
      data: { userId: createdUser.id },
    });

    await tx.userRole.createMany({
      data: [
        { userId: createdUser.id, role: RoleType.CUSTOMER },
        { userId: createdUser.id, role: RoleType.OWNER },
      ],
    });

    const finalQrCodeImage = await generateQRCode(createdUser.id);

    await tx.user.update({
      where: { id: createdUser.id },
      data: { qrCode: finalQrCodeImage },
    });

    return createdUser;
  });

  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
    select: { role: true },
  });

  const roles = userRoles.map((r) => r.role);

  const token = jwt.sign(
    { id: user.id.toString(), roles },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    message: "회원가입 성공",
    token,
    user: {
      id: user.id.toString(),
      email: user.email,
      nickname: user.nickname,
      currentRole: role,
    },
  };
};

// 이메일 기반 로그인
export const loginService = async (email, password, requestedRole) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new EmailNotFoundError(email);

  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash || ""
  );
  if (!isPasswordValid) throw new InvalidPasswordError();

  if (!Object.values(RoleType).includes(requestedRole)) {
    throw new InvalidRoleError();
  }

  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
    select: { role: true },
  });

  const roles = userRoles.map((r) => r.role);

  if (!roles.includes(requestedRole)) {
    throw new RoleNotGrantedError(requestedRole);
  }

  const token = jwt.sign(
    { id: user.id.toString(), roles, currentRole: requestedRole },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    message: "로그인 성공",
    token,
    user: {
      id: user.id.toString(),
      email: user.email,
      nickname: user.nickname,
      currentRole: requestedRole,
    },
  };
};

// 로그아웃
export const logoutService = async (userId) => {
  if (!userId)
    throw new BadRequestError("로그인된 사용자만 로그아웃할 수 있습니다.");

  await prisma.user.update({
    where: { id: Number(userId) },
    data: { fcmToken: null },
  });

  return { message: "로그아웃 완료" };
};
