// services/userCoupon.service.js
import prisma from '../../prisma/client.js';
import {
  UserCouponNotFoundError,
  UserCouponAlreadyUsedOrExpiredError,
  InvalidCouponStatusError
} from '../errors/customErrors.js';

const mapUserCoupon = (c) => {
  const couponTemplate = c.couponTemplate ?? {};
  const cafe = couponTemplate.cafe ?? {};
  const photos = cafe.photos ?? [];

  const discountType = couponTemplate.discountType;
  const menuName = couponTemplate.applicableMenu?.name ?? null;

  let couponName = couponTemplate.name ?? '';

  if (discountType === 'FREE_ITEM') {
    couponName = menuName
      ? `${menuName} 무료 쿠폰`
      : '무료 음료 쿠폰';
  }

  return {
    ...c,
    couponTemplate: {
      ...couponTemplate,
      name: couponName,
    },
    cafeId: cafe.id ?? null,
    cafeName: cafe.name ?? null,
    cafeImage: photos[0]?.photoUrl ?? null,
    usageCondition: couponTemplate.usageCondition ?? null,
  };
};

export const userCouponService = {
  async getUserCoupons(userId, status) {
    const commonInclude = {
      couponTemplate: {
        select: {
          usageCondition: true,
          cafe: {
            select: {
              id: true,
              name: true,
              photos: {
                orderBy: { displayOrder: 'asc' },
                take: 1,
                select: { photoUrl: true },
              },
            },
          },
          name: true,
          discountType: true,
          discountValue: true,
          applicableMenuId: true,
          applicableMenu: {
            select: {
              id: true,
              name: true,
            },
          },
          startDate: true,
          endDate: true,
        },
      },
    };

    if (status === 'usable') {
      const coupons = await prisma.userCoupon.findMany({
        where: {
          userId,
          status: 'active',
          OR: [
            { expiredAt: null },
            { expiredAt: { gte: now } },
          ],

          couponTemplate: {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        },
        include: commonInclude,
      });

      return coupons.map(mapUserCoupon);
    }

    if (status === 'past') {
      const coupons = await prisma.userCoupon.findMany({
        where: {
          userId,
          OR: [
            { status: 'used' },

            {
              AND: [
                { status: 'active' },
                { expiredAt: { not: null, lt: now } },
              ],
            },

            {
              AND: [
                { status: 'active' },
                {
                  couponTemplate: {
                    endDate: { not: null, lt: now },
                  },
                },
              ],
            },
          ],
        },
        include: commonInclude,
      });

      return coupons.map(mapUserCoupon);
    }

    throw new InvalidCouponStatusError(status);
  },

  async useUserCoupon(userId, userCouponId) {
    const userCoupon = await prisma.userCoupon.findFirst({
      where: {
        id: userCouponId,
        userId,
      },
    });

    if (!userCoupon) {
      throw new UserCouponNotFoundError(userCouponId);
    }

    if (userCoupon.status !== 'active') {
      throw new UserCouponAlreadyUsedOrExpiredError(userCouponId);
    }

    return await prisma.userCoupon.update({
      where: { id: userCouponId },
      data: {
        status: 'used',
        usedAt: new Date(),
      },
    });
  },
};