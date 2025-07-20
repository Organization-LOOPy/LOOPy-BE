import { logger } from "../utils/logger.js";
import prisma from "../../prisma/client.js";
import {
  MenuNotFoundError,
  FailedIssuingCouponError,
  InvalidParameterError,
} from "../errors/customErrors.js";

export const cafeRepository = {
  async findPhotos(cafeId) {
    const photos = await prisma.photo.findMany({
      where: { cafeId },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        url: true,
        displayOrder: true,
      },
    });

    return photos;
  },

  async findMenu(cafeId) {
    const menu = await prisma.menu.findMany({
      where: { cafeId },
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        photoUrl: true,
        isSoldOut: true,
      },
    });
    if (!menu || menu.length === 0) {
      logger.error(`카페 ID: ${cafeId}에 대한 메뉴가 없습니다.`);
      throw new MenuNotFoundError(cafeId);
    }

    return menu;
  },
};

export const stampBookRepository = {
  async findStampBook(userId, cafeId) {
    const stampBook = await prisma.stampBook.findUnique({
      where: { userId: userId, cafeId: cafeId },
      select: {
        stamps: true,
        currentCount: true,
        goalCount: true,
        expiredAt: true,
      },
    });

    if (!stampBook) {
      logger.debug(
        `유저 ID: ${userId}의 카페 ID: ${cafeId}에 대한 스탬프북이 없습니다.`
      );
      return null;
    }

    return stampBook;
  },
};

export const cafeCouponRepository = {
  async findCafeCoupons(cafeId) {
    const coupons = await prisma.couponTemplate.findMany({
      where: { cafeId, isActive: true },
      select: {
        id: true,
        name: true,
        validDays: true,
        discountType: true,
        discountValue: true,
        applicableMenu: true,
        expiredAt: true,
      },
    });

    return coupons;
  },

  async issueCoupon(couponInfo, userId) {
    if (!couponInfo?.couponTemplateId || !userId) {
      throw new InvalidParameterError(
        "쿠폰 정보 또는 사용자 ID가 누락되었습니다."
      );
    }

    const coupon = await prisma.userCoupon.create({
      data: {
        userId: userId,
        couponTempateId: couponInfo.couponTemplateId,
        expiredAt: new Date(
          Date.now() + couponInfo.validDays * 24 * 60 * 60 * 1000
        ), //사장님이 설정한 유효기간 후 만료
        acquisitionType: "promotion",
      },
    });

    if (!coupon) {
      throw new FailedIssuingCouponError(couponInfo.couponTemplateId, userId);
    }

    return coupon;
  },

  async findUserCoupon(couponTemplateId, userId) {
    const coupon = await prisma.userCoupon.findFirst({
      where: {
        couponTempateId: couponTemplateId,
        userId: userId,
        status: "active",
      },
    });

    return coupon;
  },
};

export const cafeReviewRepository = {
  async getCafeReviews(cafeId, cursor, take = 5) {
    const whereClause = { cafeId };

    // cursor 조건 추가
    if (cursor) {
      whereClause.id = { lt: cursor }; // createdAt desc 기준으로 cursor보다 이전 항목들
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        images: true,
        user: {
          select: {
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: take + 1, // 다음 페이지 존재 확인을 위한 take + 1
    });

    return reviews;
  },
};
