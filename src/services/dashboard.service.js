import prisma from '../../prisma/client.js';
import {
  startOfToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { CafeNotFoundError } from '../errors/customErrors.js';

export const getStampStatsByCafe = async (userId) => {
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: userId },
  });
  if (!cafe) throw new CafeNotFoundError();

  const cafeId = cafe.id;
  const todayStart = startOfToday();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  // 오늘 스탬프 수
  const todayCount = await prisma.stamp.count({
    where: {
      stampBook: { cafeId },
      stampedAt: { gte: todayStart },
    },
  });

  // 이번 주 스탬프 수
  const weekCount = await prisma.stamp.count({
    where: {
      stampBook: { cafeId },
      stampedAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
  });

  // 총 스탬프 수
  const totalCount = await prisma.stamp.count({
    where: {
      stampBook: { cafeId },
    },
  });

  // 스탬프 1번 이상 받은 고객 수
  const stampBooks = await prisma.stampBook.findMany({
    where: { cafeId },
    select: { userId: true },
  });
  const uniqueUserCount = new Set(stampBooks.map((sb) => sb.userId)).size;

  // 리워드 지급 수
  const rewardGivenCount = await prisma.stampBook.count({
    where: {
      cafeId,
      isCompleted: true,
      isConverted: true,
    },
  });

  return {
    todayStampCount: todayCount,
    thisWeekStampCount: weekCount,
    totalStampCount: totalCount,
    uniqueUserCount,
    rewardGivenCount,
  };
};
