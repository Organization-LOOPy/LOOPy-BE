import prisma from '../../prisma/client.js';
import { getCurrentPointByUserIdService } from './point.service.js';
import { UserNotFoundError, UserIdError } from '../errors/customErrors.js';

const getLoopyLevel = (count) => {
  if (count <= 3) return { level: 1, label: '호기심 많은 탐색가' };
  if (count <= 9) return { level: 2, label: '차곡차곡 쌓는 수집가' };
  if (count <= 19) return { level: 3, label: '로컬 커피 탐험가' };
  return { level: 4, label: '커피왕 루피' };
};

export const getHomeInfo = async (userId) => {
  if (!userId || isNaN(Number(userId))) throw new UserIdError();

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
      participants: {some: { userId: numericUserId },},
    },
  });

  const currentPoint = await getCurrentPointByUserIdService(numericUserId);

  const [thisMonthStampCount, totalStampCount, stampBookCount] = await Promise.all([
    prisma.stamp.count({
      where: {
        stampBook: { userId: numericUserId },
        stampedAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.stamp.count({
      where: {
        stampBook: { userId: numericUserId },
      },
    }),
    prisma.stampBook.count({
      where: { userId: numericUserId },
    }),
  ]);

  const levelInfo = getLoopyLevel(stampBookCount);

  return {
    nickname: user.nickname,
    thisMonthStampCount,
    thisMonthChallengeCount,
    totalStampCount,
    totalPoint: currentPoint ?? 0,
    loopyLevel: {
      level: levelInfo.level,
      label: levelInfo.label,
    },
  };
};