import logger from "../utils/logger.js";
import prisma from "../../prisma/client.js";
import {
  MissingCafeIdError,
  CafeNotFoundError,
  CouponNotFoundError,
} from "../errors/customErrors.js";

export const isCorectCafeId = async (req, res, next) => {
  try {
    const { cafeId } = req.params;

    if (!cafeId) {
      throw new MissingCafeIdError();
    }
    logger.debug(`카페 id 확인: ${cafeId}`);

    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
    });

    if (!cafe) {
      throw new CafeNotFoundError(cafeId);
    }

    logger.debug(`카페 ${cafe.name} 확인 완료`);

    req.cafe = cafe;

    next();
  } catch (err) {
    next(err);
  }
};

export const isMyCoupon = async (req, res, next) => {
  try {
    const { cafeId } = req.params;

    if (!req.user.id) {
      //throw new auth 커스텀 에러 나오면 추가
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

    if (!coupons) {
      throw new CouponNotFoundError(cafeId, userId);
    }
    logger.debug(`쿠폰 ${coupon.id} 확인 완료`);
    req.coupons = coupons;

    next();
  } catch (err) {
    next(err);
  }
};
