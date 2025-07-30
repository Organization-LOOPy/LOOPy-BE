import prisma from '../../prisma/client.js';
import { getCurrentPointByUserIdService } from './point.service.js';
import { UserNotFoundError } from '../errors/customErrors.js';

export const getHomeInfo = async (userId) => {
  console.log('[DEBUG] service userId:', userId);

   if (!userId || isNaN(Number(userId))) {
    throw new Error('유효하지 않은 userId');
  }
  const numericUserId = Number(userId);

  const user = await prisma.user.findUnique({
    where: { id: numericUserId },
    select: { nickname: true },
  });
  
  if (!user) throw new UserNotFoundError(numericUserId);

   const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);
  const thisMonthChallengeCount = await prisma.challenge.count({
    where: {
      isActive: true,
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
      participants: {
        some: { userId: numericUserId },
      },
    },
  });

  const currentPoint = await getCurrentPointByUserIdService(user.id);

  const [thisMonthStampCount, totalStampCount] = await Promise.all([
  prisma.stamp.count({
    where: {
      stampBook: {
        userId: numericUserId,
      },
      stampedAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  }),
  prisma.stamp.count({
    where: {
      stampBook: {
        userId: numericUserId,
      },
    },
  }),
]);

  return {
    nickname: user.nickname,
    thisMonthStampCount,
    thisMonthChallengeCount, 
    totalStampCount,
    totalPoint: currentPoint ?? 0,
  };
};
