import pkg from '@prisma/client';
const { PrismaClient, PointTransactionType } = pkg;

const prisma = new PrismaClient();

import { signActionToken, markJtiUsed } from '../utils/actionToken.js';

// 전화번호 고객 조회
const normalizePhone = (v = '') => v.replace(/\D/g, '');
const formatPhoneDisplay = (digits) => {
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
};

export const getUserByPhone = async (req, res, next) => {
  const cafeId = req.user.cafeId;

  const rawPhone = req.query.phone;

  try {
    if (!rawPhone) return res.error({ reason: '전화번호 입력 누락' });
    if (!cafeId) return res.error({ reason: '카페 ID 정보가 없습니다.' });

    const phone = normalizePhone(rawPhone);

    const user = await prisma.user.findFirst({
      where: { phoneNumber: phone },
      select: {
        id: true,
        nickname: true,
        phoneNumber: true
      }
    });

    if (!user) return res.error({ reason: '해당 전화번호의 고객을 찾을 수 없습니다.' });

    let sb = await prisma.stampBook.findFirst({
      where: {
        userId: user.id,
        cafeId,
        convertedAt: null,
        expiredAt: null,
        isCompleted: false
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        currentCount: true,
        goalCount: true,
        expiresAt: true
      }
    });

    if (!sb) {
      sb = await prisma.stampBook.create({
        data: {
          userId: user.id,
          cafeId,
          currentCount: 0,
          goalCount: 10,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          isCompleted: false,
          isConverted: false,
          round: 1
        },
        select: {
          id: true,
          currentCount: true,
          goalCount: true,
          expiresAt: true
        }
      });
    }

    const totalStampCount = await prisma.stampBook.count({
      where: { userId: user.id }
    });

    const pointAgg = await prisma.pointTransaction.aggregate({
      where: { 
        userId: user.id, 
        type: PointTransactionType.earned
      },
      _sum: { point: true } 
    });
    const totalPoint = pointAgg._sum.point ?? 0;

    const progressRate = sb ? Math.floor((sb.currentCount / sb.goalCount) * 100) : null;
    const daysLeft = sb
      ? Math.max(0, Math.ceil((new Date(sb.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

      const actionToken = signActionToken({
        userId: user.id,
        cafeId,
        scope: 'ADD_STAMP',
        ttlSec: 120
        });

    return res.success({
      userId: user.id,
      nickname: user.nickname,
      phone: formatPhoneDisplay(normalizePhone(user.phoneNumber || phone)),
      stamp: {
        totalCount: totalStampCount,
        currentStampBook: sb
          ? {
              stampBookId: sb.id,
              currentCount: sb.currentCount,
              goalCount: sb.goalCount,
              progressRate,
              expiresAt: sb.expiresAt,
              daysLeft
            }
          : null
      },
      point: { total: totalPoint },
      actionToken
    });
  } catch (err) {
    next(err);
  }
};

// 스탬프 적립
export const addStampToUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const cafeId = req.user?.cafeId;

    if (!Number.isInteger(userId)) {
      return res.error({ errorCode: "BAD_REQUEST", reason: "유효하지 않은 사용자 ID입니다.", data: null }, 400);
    }
    if (!cafeId) {
      return res.error({ errorCode: "CAFE_REQUIRED", reason: "사장님 토큰에 카페 정보가 없습니다.", data: null }, 403);
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return res.error({ errorCode: "USER_NOT_FOUND", reason: "존재하지 않는 사용자입니다.", data: null }, 404);
    }

    let updatedBook;

    await prisma.$transaction(async (tx) => {
      let book = await tx.stampBook.findFirst({
        where: {
          userId,
          cafeId,
          convertedAt: null,
          expiredAt: null,
          isCompleted: false,
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!book) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        book = await tx.stampBook.create({
          data: {
            userId,
            cafeId,
            currentCount: 0,
            goalCount: 10,
            isCompleted: false,
            isConverted: false,
            startedAt: now,         
            status: 'active',       
            expiresAt,
          },
        });
      }

      if (book.currentCount >= book.goalCount) {
        throw Object.assign(new Error("GOAL_EXCEEDED"), { code: "GOAL_EXCEEDED" });
      }

      const now = new Date();

      await tx.stamp.create({
        data: {
          stampBookId: book.id,
          stampedAt: now,       
          source: 'owner',      
          method: 'MANUAL',     
        },
      });


      updatedBook = await tx.stampBook.update({
        where: { id: book.id },
        data: {
          currentCount: { increment: 1 },
          lastVisitedAt: now,
        },
        select: { id: true, currentCount: true, goalCount: true, isCompleted: true, status: true },
      });

      if (!updatedBook.isCompleted && updatedBook.currentCount >= updatedBook.goalCount) {
        updatedBook = await tx.stampBook.update({
          where: { id: book.id },
          data: {
            isCompleted: true,
            completedAt: now,
            status: 'completed',  
          },
          select: { id: true, currentCount: true, goalCount: true, isCompleted: true, status: true },
        });
      }
    });

    if (req.actionToken?.jti) {
      await markJtiUsed(req.actionToken.jti); 
    }

    return res.success({
      stampBookId: updatedBook.id,
      currentCount: updatedBook.currentCount,
      goalCount: updatedBook.goalCount,
      isCompleted: updatedBook.isCompleted,
    });
  } catch (err) {
    if (err && err.code === "GOAL_EXCEEDED") {
      return res.error({ errorCode: "STAMPBOOK_ALREADY_COMPLETED", reason: "이미 목표를 달성한 스탬프북입니다.", data: null }, 409);
    }
    next(err);
  }
};

// QR로 고객 식별 (이제는 userId 기반 조회)
export const verifyQRToken = async (req, res, next) => {
  try {
    const userId = req.body?.userId; // ← 프론트에서 QR → userId 변환 후 전달
    const cafeId = req.user?.cafeId;

    if (!userId) {
      return res.error({ errorCode: 'BAD_REQUEST', reason: 'userId가 필요합니다.', data: null }, 400);
    }
    if (!cafeId) {
      return res.error({ errorCode: 'CAFE_REQUIRED', reason: '사장님 토큰에 카페 정보가 없습니다.', data: null }, 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        stampBooks: {
          where: { cafeId, convertedAt: null, expiredAt: null, isCompleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        userCoupons: {
          where: {
            usedAt: null,
            expiredAt: { gte: new Date() },
            couponTemplate: { is: { cafeId } },
          },
          include: { couponTemplate: true },
        },
      },
    });

    if (!user) {
      return res.error({ errorCode: 'USER_NOT_FOUND', reason: '해당 고객 정보를 찾을 수 없습니다.', data: null }, 404);
    }

    const now = new Date();
    const [totalStampCount, earnedAgg, spentAgg, activeChallenges] = await Promise.all([
      prisma.stamp.count({ where: { userId: user.id } }),
      prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'EARNED' }, _sum: { amount: true } }),
      prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'SPENT' }, _sum: { amount: true } }),
      prisma.challengeParticipant.findMany({
        where: {
          userId: user.id,
          completedAt: null,
          challenge: {
            is: {
              isActive: true,
              startDate: { lte: now },
              endDate: { gte: now },
              availableCafes: { some: { cafeId } },
            },
          },
        },
        include: { challenge: true },
      }),
    ]);

    const totalPoint = (earnedAgg._sum.amount ?? 0) - (spentAgg._sum.amount ?? 0);
    const currentStampBook = user.stampBooks[0] ?? null;

    const availableCoupons = user.userCoupons.map((uc) => ({
      userCouponId: uc.id,
      name: uc.couponTemplate.name,
      description: uc.couponTemplate.description,
      expiredAt: uc.expiredAt,
    }));

    const ongoingChallenges = activeChallenges.map((cp) => ({
      challengeId: cp.challenge.id,
      title: cp.challenge.title,
      expiredAt: cp.challenge.endDate,
    }));

    return res.success({
      userId: user.id,
      nickname: user.nickname,
      stamp: currentStampBook
        ? {
            totalCount: totalStampCount,
            currentStampBook: {
              stampBookId: currentStampBook.id,
              currentCount: currentStampBook.currentCount,
              goalCount: currentStampBook.goalCount,
            },
          }
        : { totalCount: totalStampCount, currentStampBook: null },
      point: { total: totalPoint },
      availableCoupons,
      ongoingChallenges,
    });
  } catch (err) {
    next(err);
  }
};



  // 포인트 사용
  export const useUserPoint = async (req, res, next) => {
    const userId = parseInt(req.params.userId, 10);
    const { amount } = req.body;
    const cafeId = req.user.cafeId;
  
    try {
      if (!amount || amount <= 0) {
        return res.error('사용할 포인트 금액이 올바르지 않습니다.', 400);
      }
  
      await prisma.pointTransaction.create({
        data: {
          userId,
          cafeId,
          amount,
          type: 'USED',
          description: '사장님 포인트 사용 처리',
        },
      });
  
      return res.success('포인트 사용 완료', { usedAmount: amount });
    } catch (err) {
      next(err);
    }
  }; 

// 쿠폰 사용 처리
export const useUserCoupon = async (req, res, next) => {
    const userId = parseInt(req.params.userId, 10);
    const couponId = parseInt(req.params.couponId, 10);
  
    try {
      const userCoupon = await prisma.userCoupon.findFirst({
        where: {
          id: couponId,
          userId,
          usedAt: null,
          expiredAt: {
            gte: new Date(),
          },
        },
      });
  
      if (!userCoupon) {
        return res.error('사용 가능한 쿠폰이 없습니다.', 404);
      }
  
      const updatedCoupon = await prisma.userCoupon.update({
        where: { id: couponId },
        data: {
          usedAt: new Date(),
        },
      });
  
      return res.success('쿠폰 사용 처리 완료', {
        userCouponId: updatedCoupon.id,
        usedAt: updatedCoupon.usedAt,
      });
    } catch (err) {
      next(err);
    }
  };

  // 챌린지 인증 처리
  export const verifyChallengeForUser = async (req, res, next) => {
    const userId = parseInt(req.params.userId, 10);
    const challengeId = parseInt(req.params.challengeId, 10);
    const cafeId = req.user.cafeId;
  
    try {
      const participation = await prisma.challengeParticipant.findUnique({
        where: {
          userId_challengeId: {
            userId,
            challengeId,
          },
        },
      });
  
      if (!participation) {
        return res.error('챌린지 참여 이력이 없습니다.', 404);
      }
  
      if (participation.completedAt) {
        return res.error('이미 완료된 챌린지입니다.', 400);
      }
  
      if (participation.joinedCafeId !== cafeId) {
        return res.error('해당 카페에서 인증할 수 없는 챌린지입니다.', 403);
      }
  
      // 챌린지 완료 처리
      await prisma.challengeParticipant.update({
        where: {
          userId_challengeId: {
            userId,
            challengeId,
          },
        },
        data: {
          completedAt: new Date(),
        },
      });
  
      return res.success('챌린지 인증 완료');
    } catch (err) {
      next(err);
    }
  };