import prisma from '../../prisma/client.js';

export const expireUserCouponsService = async () => {
  const now = new Date();

  const result = await prisma.userCoupon.updateMany({
    where: {
      status: 'active',
      OR: [
        // userCoupon 자체 만료
        {
          expiredAt: {
            not: null,
            lt: now,
          },
        },

        // couponTemplate 종료일 기준 만료
        {
          couponTemplate: {
            endDate: {
              not: null,
              lt: now,
            },
          },
        },
      ],
    },
    data: {
      status: 'expired',
    },
  });

  return {
    expiredCount: result.count,
    executedAt: now,
  };
};
