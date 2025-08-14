import { logger } from "../utils/logger.js";
import prisma from "../../prisma/client.js";
import {
  MenuNotFoundError,
  FailedIssuingCouponError,
  InvalidParameterError,
} from "../errors/customErrors.js";

export const cafeRepository = {
  async findCafeDetails(cafeId, userId) {
    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: {
        id: true,

        photos: {
          select: {
            id: true,
            photoUrl: true,
            displayOrder: true,
          },
          orderBy: { displayOrder: "asc" },
        },

        menu: {
          select: {
            id: true,
            name: true,
            price: true,
            isRepresentative: true,
            description: true,
            photoUrl: true,
            isSoldOut: true,
          },
          orderBy: { isRepresentative: "desc" },
        },

        CouponTemplate: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            discountType: true,
            discountValue: true,
            applicableMenu: true,
            createdAt: true,
            expiredAt: true,
            userCoupons: {
              where: { userId },
              select: { id: true },
            },
          },
        },

        challengeAvailable: {
          select: {
            challengeId: true,
            challenge: {
              select: {
                title: true,
                thumbnailUrl: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },

        bookmarkedBy: {
          where: { userId },
          select: { id: true },
        },

        stampBooks: {
          where: { userId },
          select: {
            id: true,
            currentCount: true,
            goalCount: true,
            expiresAt: true,
          },
        },

        stampImages: {
          select: {
            id: true,
            imageUrl: true,
          },
        },

        stampPolicies: {
          select: {
            id: true,
            rewardType: true,
            discountAmount: true,
            menu: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    console.log(cafe);

    return cafe;
  },

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
  async findById(cafeId) {
    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
    });
    return cafe;
  },
};

export const cafeNotificationRepository = {
  async findNotification(cafeId, userId) {
    const notification = await prisma.userCafeNotification.findUnique({
      where: {
        userId_cafeId: {
          userId,
          cafeId,
        },
      },
      select: {
        userId: true,
        cafeId: true,
      },
    });

    return notification;
  },

  async removeNotification(cafeId, userId) {
    await prisma.userCafeNotification.delete({
      where: {
        userId_cafeId: {
          userId,
          cafeId,
        },
      },
    });
  },

  async addNotification(cafeId, userId) {
    const notification = await prisma.userCafeNotification.create({
      data: {
        userId,
        cafeId,
      },
    });

    return notification;
  },
};

export const cafeCouponRepository = {
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

  async deleteBookmark(cafeId, userId) {
    const bookmark = await prisma.userBookmark.delete({
      where: {
        userId_cafeId: {
          // Prisma가 생성하는 복합 unique 입력명
          userId,
          cafeId,
        },
      },
      select: {
        id: true,
      },
    });
    return bookmark;
  },
};
