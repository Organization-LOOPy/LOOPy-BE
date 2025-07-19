import logger from "../utils/logger.js";
import prisma from "../../prisma/client.js";
import {
  MissingCafeIdError,
  CouponNotFoundError,
  NotAuthenticatedError,
  InvalidParameterError,
} from "../errors/customErrors.js";

export const isCorrectCafeId = async (req, res, next) => {
  try {
    const { cafeId } = req.params;

    if (!cafeId) {
      throw new MissingCafeIdError();
    }
    logger.debug(`카페 id 확인: ${cafeId}`);

    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: {
        id: true,
        name: true,
        address: true,
        ownerName: true,
        phone: true,
        website: true,
        description: true,
        keywords: true,
      },
    });

    if (!cafe) {
      throw new InvalidParameterError(cafeId);
    }

    logger.debug(`카페 ${cafe.name} 확인 완료`);

    req.cafe = cafe;

    next();
  } catch (err) {
    logger.error(`카페 ID 확인 중 오류 발생: ${err.message}`);
    next(err);
  }
};

export const isMyCoupon = async (req, res, next) => {
  try {
    const { cafeId } = req.params;

    if (!req.user.id) {
      throw new NotAuthenticatedError();
    }
    logger.debug(`유저 ${req.user.id} 확인`);

    const coupons = await prisma.coupon.findMany({
      where: { userId: req.user.id, cafeId: cafeId, status: "active" },
      select: {
        id: true,
        cafeId: true,
        userId: true,
        type: true,
        expiredAt: true,
      },
    });

    if (coupons.length === 0) {
      throw new CouponNotFoundError(cafeId, req.user.id);
    }
    logger.debug(
      `사용자 ${req.user.id}의 사용가능 쿠폰 ${coupons.length}개 확인:`,
      JSON.stringify(coupons, null, 2)
    );
    req.coupons = coupons;

    next();
  } catch (err) {
    logger.error(`쿠폰 확인 중 오류 발생: ${err.message}`);
    next(err);
  }
};
