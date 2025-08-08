// services/userCoupon.service.js
import prisma from '../../prisma/client.js';
import {
  UserCouponNotFoundError,
  UserCouponAlreadyUsedOrExpiredError,
  InvalidCouponStatusError
} from '../errors/customErrors.js';

export const userCouponService = {
  async getUserCoupons(userId, status) {
    const now = new Date();

    if (status === 'usable') {
      return await prisma.userCoupon.findMany({
        where: {
          userId,
          status: 'active',
          expiredAt: { gt: now },
        },
        include: { couponTemplate: true },
      });
    }

    if (status === 'past') {
      return await prisma.userCoupon.findMany({
        where: {
          userId,
          OR: [
            { status: 'used' },
            { expiredAt: { lte: now } },
          ],
        },
        include: { couponTemplate: true },
      });
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
