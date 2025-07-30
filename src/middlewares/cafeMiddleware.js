import { logger } from "../utils/logger.js";
import prisma from "../../prisma/client.js";
import {
  MissingCafeIdError,
  AlreadyIssuedCouponError,
  NotAuthenticatedError,
  InvalidParameterError,
} from "../errors/customErrors.js";

export const test = async (req, res, next) => {
  const user = {
    id: 1, // BigInt 타입
    email: "test@example.com",
    phoneNumber: "010-1234-5678",
    nickname: "testUser",
    role: "user", // UserRole enum 값
    allowKakaoAlert: false,
    status: "active", // UserStatus enum 값
    fcmToken: "test_fcm_token_123",
    createdAt: new Date(),
    updatedAt: new Date(),
    inactivedAt: null,
    //profileImageUrl: "https://example.com/profile.jpg", // Review 조회 시 필요
  };

  // req.user에 테스트 사용자 정보 추가
  req.user = user;
  next();
};

export const isCorrectCafeId = async (req, res, next) => {
  try {
    const { cafeId } = req.params;

    if (!cafeId) {
      throw new MissingCafeIdError();
    }

    const numericCafeId = parseInt(cafeId, 10);

    if (isNaN(numericCafeId) || numericCafeId <= 0) {
      throw new InvalidParameterError(cafeId);
    }

    logger.debug(`카페 id 확인: ${numericCafeId}`);

    const cafe = await prisma.cafe.findUnique({
      where: {
        id: numericCafeId,
      },
      select: {
        id: true,
        name: true,
        address: true,
        businessHours: true,
        phone: true,
        websiteUrl: true,
        description: true,
        storeFilters: true,
        takeOutFilters: true,
        menuFilters: true,
        keywords: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!cafe) {
      throw new InvalidParameterError(cafeId);
    }

    logger.debug(`카페 ${cafe.name} 확인 완료`);
    req.cafe = cafe;
    req.cafeId = numericCafeId;

    next();
  } catch (err) {
    logger.error(`카페 ID 확인 중 오류 발생: ${err.message}`);
    next(err);
  }
};

export const isMyCoupon = async (req, res, next) => {
  try {
    const couponInfo = req.body; // req.body 자체가 쿠폰 정보

    if (!req.user.id) {
      throw new NotAuthenticatedError();
    }

    if (!couponInfo?.id) {
      throw new InvalidParameterError("쿠폰 템플릿 ID가 누락되었습니다.");
    }

    logger.debug(`유저 ${req.user.id}의 쿠폰 중복 확인`);

    const existingCoupon = await prisma.userCoupon.findFirst({
      where: {
        userId: req.user.id,
        couponTemplateId: couponInfo.id,
      },
      select: {
        id: true,
        status: true,
        issuedAt: true,
      },
    });

    if (existingCoupon) {
      throw new AlreadyIssuedCouponError(couponInfo.id, req.user.id);
    }

    logger.debug(`쿠폰 중복 확인 완료 - 발급 가능`);

    // req에 couponInfo 추가
    req.couponInfo = couponInfo;
    next();
  } catch (err) {
    logger.error(`쿠폰 중복 확인 중 오류 발생: ${err.message}`);
    next(err);
  }
};
