// services/userCoupon.service.js
import prisma from '../../prisma/client.js';
import {
  UserCouponNotFoundError,
  UserCouponAlreadyUsedOrExpiredError,
  InvalidCouponStatusError
} from '../errors/customErrors.js';

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
        },
        include: commonInclude,
      });

      return coupons.map((c) => ({
        ...c,
        cafeId: c.couponTemplate?.cafe?.id ?? null,
        cafeName: c.couponTemplate?.cafe?.name ?? null,
        cafeImage: c.couponTemplate?.cafe?.photos?.[0]?.photoUrl ?? null,
        usageCondition: c.couponTemplate?.usageCondition ?? null,
      }));
    }

    if (status === 'past') {
      const coupons = await prisma.userCoupon.findMany({
        where: {
          userId,
          OR: [
            { status: 'used' },
          ],
        },
        include: commonInclude,
      });

      return coupons.map((c) => ({
        ...c,
        cafeId: c.couponTemplate?.cafe?.id ?? null,
        cafeName: c.couponTemplate?.cafe?.name ?? null,
        cafeImage: c.couponTemplate?.cafe?.photos?.[0]?.photoUrl ?? null,
        usageCondition: c.couponTemplate?.usageCondition ?? null,
      }));
    }

    throw new InvalidCouponStatusError(status);
  },

  async useUserCoupon(userId, userCouponId) {
    const userCoupon = await prisma.userCoupon.findFirst({
      where: { id: userCouponId, userId },
    });

    if (!userCoupon) throw new UserCouponNotFoundError(userCouponId);
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
