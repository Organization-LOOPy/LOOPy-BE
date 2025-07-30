import { logger } from "../utils/logger.js";
import prisma from "../../prisma/client.js";
import {
  MenuNotFoundError,
  FailedIssuingCouponError,
  InvalidParameterError,
} from "../errors/customErrors.js";

export const cafeRepository = {
  async findPhotos(cafeId) {
    const photos = await prisma.CafePhoto.findMany({
      where: { cafeId },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        photoUrl: true,
        displayOrder: true,
      },
    });

    return photos;
  },

  async findMenu(cafeId) {
    const menu = await prisma.CafeMenu.findMany({
      where: { cafeId },
      select: {
        id: true,
        name: true,
        price: true,
        isRepresentative: true,
        description: true,
        photoUrl: true,
        isSoldOut: true,
      },
      orderBy: {
        isRepresentative: "desc", //대표메뉴 맨 위로
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
      where: {
        userId_cafeId: {
          // 자동 생성된 복합 유니크 필드
          userId: userId,
          cafeId: cafeId,
        },
      },
      select: {
        id: true,
        currentCount: true,
        goalCount: true,
        expiresAt: true,
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
        discountType: true,
        discountValue: true,
        applicableMenu: true,
        createdAt: true,
        expiredAt: true,
      },
    });

    return coupons;
  },

  async issueCoupon(couponInfo, userId) {
    const { id, createdAt, expiredAt } = couponInfo;

    const coupon = await prisma.userCoupon.create({
      data: {
        userId,
        couponTemplateId: id,
        expiredAt: new Date(expiredAt),
        //사장님이 설정한 유효기간 후 만료
        acquisitionType: "promotion",
      },
      select: {
        id: true,
        expiredAt: true,
        acquisitionType: true,
        couponTemplate: {
          select: {
            id: true,
            name: true,
            discountType: true,
            discountValue: true,
            applicableMenu: {
              select: {
                name: true,
                description: true,
                photoUrl: true,
              },
            },
            expiredAt: true,
          },
        },
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
    const whereClause = {
      cafeId: cafeId,
    };

    // cursor 조건 추가
    if (cursor) {
      whereClause.id = { lt: cursor };
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
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: take + 1, // 다음 페이지 존재 확인을 위한 take + 1
    });

    return reviews;
  },
};

export const cafeBookmarkRepository = {
  async isBookmarked(cafeId, userId) {
    const isBookmarked = await prisma.userBookmark.findUnique({
      where: {
        userId_cafeId: {
          // 복합키 이름 (스키마에 정의된 대로)
          userId: userId,
          cafeId: cafeId,
        },
      },
      select: {
        id: true,
      },
    });
    return isBookmarked ? isBookmarked : null;
  },
  async addBookmark(cafeId, userId) {
    const bookmark = await prisma.userBookmark.create({
      data: {
        userId: userId,
        cafeId: cafeId,
      },
      select: {
        id: true,
      },
    });
    return bookmark;
  },
};
