import prisma from '../../prisma/client.js';
import {
  startOfToday,
  format,
  subDays,
  addDays,
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

  const sixDaysAgoStart = subDays(todayStart, 6);
  const tomorrowStart = addDays(todayStart, 1);

  const daysInRange = eachDayOfInterval({
    start: sixDaysAgoStart,
    end: todayStart,
  });

  const [
    todayCount,
    last7DaysCount,
    totalCount,
    rewardGivenCount,
  ] = await Promise.all([
    prisma.stamp.count({
      where: {
        stampBook: { cafeId },
        stampedAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.stamp.count({
      where: {
        stampBook: { cafeId },
        stampedAt: { gte: sixDaysAgoStart, lt: tomorrowStart },
      },
    }),
    prisma.stamp.count({
      where: { stampBook: { cafeId } },
    }),
    prisma.stampBook.count({
      where: { cafeId, isCompleted: true },
    }),
  ]);

  const uniqueUserIds = await prisma.stampBook.findMany({
    where: { cafeId },
    select: { userId: true },
    distinct: ['userId'],
  });
  const uniqueUserCount = uniqueUserIds.length;

  const dailyStampCounts = await Promise.all(
    daysInRange.map(async (date) => {
      const nextDate = addDays(date, 1);
      const count = await prisma.stamp.count({
        where: {
          stampBook: { cafeId },
          stampedAt: { gte: date, lt: nextDate },
        },
      });
      return { date: format(date, 'yyyy-MM-dd'), count };
    })
  );

  return {
    '오늘 스탬프 적립 수': todayCount,
    thisWeekStampCount: last7DaysCount,
    totalStampCount: totalCount,
    uniqueUserCount,
    rewardGivenCount,
    dailyStampCounts,
  };
};