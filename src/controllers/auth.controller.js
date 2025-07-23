import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../prisma/client.js";
import {
  DuplicateEmailError,
  MissingFieldsError,
  UserNotFoundError,
  InvalidPasswordError,
  InternalServerError,
} from "../errors/customErrors.js";

// 회원가입
export const signup = async (req, res, next) => {
  try {
    const { email, password, nickname, phoneNumber, agreements } = req.body;

    if (!email || !password || !nickname || !phoneNumber) {
      throw new MissingFieldsError([
        "email",
        "password",
        "nickname",
        "phoneNumber",
      ]);
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
          role: "CUSTOMER",
          allowKakaoAlert: false,
          status: "active",
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
        data: {
          userId: createdUser.id,
        },
      });

      return createdUser;
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "회원가입 성공",
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
        nickname: user.nickname,
      },
    });
  } catch (err) {
    return next(new InternalServerError("회원가입 실패", err));
  }
};

// 로그인
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UserNotFoundError(email);
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash || ""
    );

    if (!isPasswordValid) {
      throw new InvalidPasswordError();
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "로그인 성공",
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 로그아웃
export const logout = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        fcmToken: null,
      },
    });

    return res.json({ message: "로그아웃 완료" });
  } catch (error) {
    next(error);
  }
};
