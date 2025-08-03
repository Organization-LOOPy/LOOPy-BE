import prisma from '../../prisma/client.js';
import {
  startOfToday,
  startOfWeek,
  endOfWeek,
  format,
  eachDayOfInterval
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


  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const [
    todayCount,
    weekCount,
    totalCount,
    rewardGivenCount
  ] = await Promise.all([
    prisma.stamp.count({
      where: {
        stampBook: { cafeId },
        stampedAt: { gte: todayStart },
      },
    }),
    prisma.stamp.count({
      where: {
        stampBook: { cafeId },
        stampedAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    }),
    prisma.stamp.count({
      where: {
        stampBook: { cafeId },
      },
    }),
    prisma.stampBook.count({
      where: {
        cafeId,
        isCompleted: true,
      },
    }),
  ]);

  const uniqueUserIds = await prisma.stampBook.findMany({
    where: { cafeId },
    select: { userId: true },
    distinct: ['userId'],
  });
  const uniqueUserCount = uniqueUserIds.length;

  // 요일별 스탬프 수 (그래프용)
  const dailyStampCounts = await Promise.all(
    daysOfWeek.map(async (date) => {
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const count = await prisma.stamp.count({
        where: {
          stampBook: { cafeId },
          stampedAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      return {
        date: format(date, 'yyyy-MM-dd'),
        count,
      };
    })
  );

  return {
    "오늘 스탬프 적립 수": todayCount,
    thisWeekStampCount: weekCount,
    totalStampCount: totalCount,
    uniqueUserCount,
    rewardGivenCount,
    dailyStampCounts,
  };
};