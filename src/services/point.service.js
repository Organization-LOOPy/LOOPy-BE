import prisma from '../../prisma/client.js';
import { PointTransactionNotFoundError } from '../errors/customErrors.js';

// 현재 포인트 조회 
export const getCurrentPointByUserIdService = async (userId) => {
  const parsedUserId = Number(userId);
  console.log('[DEBUG] Parsed userId:', parsedUserId); 

  if (isNaN(parsedUserId)) {
    throw new Error('userId가 유효한 숫자가 아닙니다.');
  }

  const result = await prisma.pointTransaction.aggregate({
    where: { userId: parsedUserId },
    _sum: { point: true },
  });

  const total = result._sum.point ?? 0;

  return total;
};

// 포인트 내역 조회 
export const getPointTransactionsByUserId = async (userId) => {
  const transactions = await prisma.pointTransaction.findMany({
    where: {
      userId: Number(userId), 
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      stampBook: {
        include: {
          cafe: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!transactions || transactions.length === 0) {
    throw new PointTransactionNotFoundError({ userId });
  }

  return transactions.map((tx) => ({
    id: tx.id,
    point: tx.point,
    type: tx.type,
    description: tx.description,
    createdAt: tx.createdAt,
    cafeName: tx.stampBook?.cafe?.name ?? null,
  }));
};