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

    const totalStampCount = await prisma.stamp.count({
      where: { stampBook: { userId: user.id } }
      });

      const [earnedAgg, spentAgg, refundedAgg] = await Promise.all([
        prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'earned' },   _sum: { point: true } }),
        prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'spent' },    _sum: { point: true } }),
        prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'refunded' }, _sum: { point: true } }),
        ]);

      const totalPoint =
          (earnedAgg._sum.point ?? 0) +
          (refundedAgg._sum.point ?? 0) -
          (spentAgg._sum.point ?? 0);

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
    const cafeId = Number(req.user?.cafeId); // 숫자로 보정

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
      // 1) 진행 중 스탬프북 조회
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

      // 2) 없으면 생성 (round = max+1)
      if (!book) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const max = await tx.stampBook.aggregate({
          where: { userId, cafeId },
          _max: { round: true },
        });
        const nextRound = (max._max.round ?? 0) + 1;

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
            round: nextRound,
          },
        });
      }

      const now = new Date();

      // 3) 동시성 안전: 목표 미만일 때만 1 증가 (조건부 업데이트)
      const inc = await tx.stampBook.updateMany({
        where: { id: book.id, isCompleted: false, status: 'active', currentCount: { lt: book.goalCount } },
        data: { currentCount: { increment: 1 }, lastVisitedAt: now },
      });

      if (inc.count === 0) {
        // 다른 트랜잭션이 먼저 완료시켰거나 목표 도달
        throw Object.assign(new Error("GOAL_EXCEEDED"), { code: "GOAL_EXCEEDED" });
      }

      // 4) 증가 성공 후 스탬프 레코드 생성 (숫자와 실제 스탬프 개수 동기화)
      await tx.stamp.create({
        data: {
          stampBookId: book.id,
          stampedAt: now,
          source: 'owner',
          method: 'MANUAL',
        },
      });

      // 5) 현재 상태 재조회
      updatedBook = await tx.stampBook.findUnique({
        where: { id: book.id },
        select: { id: true, currentCount: true, goalCount: true, isCompleted: true, status: true },
      });

      // 6) 목표 도달 시 완료 처리
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


// 고객 QR 인증
export const verifyQRToken = async (req, res, next) => {
  try {
    const userId = req.body?.userId;
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

    const [totalStampCount, earnedAgg, spentAgg, refundedAgg, activeChallenges] = await Promise.all([
      prisma.stamp.count({ where: { stampBook: { userId: user.id } } }), // ← 관계 필터
      prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'earned' },   _sum: { point: true } }),
      prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'spent' },    _sum: { point: true } }),
      prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'refunded' }, _sum: { point: true } }),
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

    const totalPoint =
      (earnedAgg._sum.point ?? 0) +
      (refundedAgg._sum.point ?? 0) -
      (spentAgg._sum.point ?? 0);

    const currentStampBook = user.stampBooks[0] ?? null;

    const availableCoupons = user.userCoupons.map((uc) => ({
      userCouponId: uc.id,
      name: uc.couponTemplate.name,
      usageCondition: uc.couponTemplate.usageCondition, // ← description 대신
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
      point: { total: totalPoint }, // ← 총액 정상 계산
      availableCoupons,
      ongoingChallenges,
    });
  } catch (err) {
    next(err);
  }
};

// 포인트 전액 사용 (잔액=0)
export const useUserPoint = async (req, res, next) => {
  const userId = Number(req.params.userId);

  try {
    const data = await prisma.$transaction(async (tx) => {
      const locked = await tx.$executeRaw`
        SELECT id FROM users WHERE id = ${userId} FOR UPDATE
      `;

      const [earned, spent, refunded] = await Promise.all([
        tx.pointTransaction.aggregate({
          where: { userId, type: 'earned' },
          _sum: { point: true },
        }),
        tx.pointTransaction.aggregate({
          where: { userId, type: 'spent' },
          _sum: { point: true },
        }),
        tx.pointTransaction.aggregate({
          where: { userId, type: 'refunded' },
          _sum: { point: true },
        }),
      ]);

      const sum = (v) => v?._sum?.point ?? 0;
      const balance = sum(earned) + sum(refunded) - sum(spent);

      if (balance <= 0) throw new Error('NO_BALANCE');

      await tx.pointTransaction.create({
        data: {
          userId,
          point: balance,
          type: 'spent',
          description: '전액 사용',
        },
      });

      return {
        before: balance,
        usedAmount: balance,
        remaining: 0,
      };
    });

    return res.success('포인트 전액 사용 완료', data);
  } catch (err) {
    if (err.message === 'NO_BALANCE') {
      return res.error('사용 가능한 포인트가 없습니다.', 400);
    }
    next(err);
  }
};

// 쿠폰 사용 처리
export const useUserCoupon = async (req, res, next) => {
  const userId = Number(req.params.userId);
  const couponId = Number(req.params.couponId);

  try {
    const updated = await prisma.userCoupon.updateMany({
      where: {
        id: couponId,
        userId,
        usedAt: null,
        expiredAt: { gte: new Date() },
        status: 'active',
      },
      data: {
        usedAt: new Date(),
        status: 'used', // 명시적으로 상태 변경
      },
    });

    if (updated.count === 0) {
      return res.error('사용 가능한 쿠폰이 없습니다.', 400);
    }

    return res.success('쿠폰 사용 처리 완료', {
      userCouponId: couponId,
      usedAt: new Date(),
    });
  } catch (err) {
    next(err);
  }
};

// 챌린지 인증(이 챌린지에서만 3회 완료 시 보상)
export const verifyChallengeForUser = async (req, res, next) => {
  const userId = Number(req.params.userId);
  const challengeId = Number(req.params.challengeId);
  const cafeId = req.user?.cafeId;

  try {
    if (!cafeId) return res.error('사장님 토큰에 카페 정보가 없습니다.', 403);
    const now = new Date();

    const participant = await prisma.challengeParticipant.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      select: { completedAt: true, joinedCafeId: true },
    });

    if (!participant) return res.error('챌린지 참여 이력이 없습니다.', 404);
    if (participant.completedAt) return res.error('이미 완료된 챌린지입니다.', 400);
    if (participant.joinedCafeId !== cafeId) return res.error('해당 카페에서 인증할 수 없는 챌린지입니다.', 403);

    const result = await prisma.$transaction(async (tx) => {
      // 1) 완료 처리
      const updated = await tx.challengeParticipant.updateMany({
        where: { userId, challengeId, completedAt: null, joinedCafeId: cafeId },
        data: { completedAt: now, status: 'completed' },
      });
      if (updated.count === 0) throw new Error('ALREADY_COMPLETED_OR_INVALID');

      // 2) 이 챌린지에서 완료한 횟수 집계
      const completedCount = await tx.challengeParticipant.count({
        where: { userId, challengeId, completedAt: { not: null } },
      });

      let milestoneRewarded = 0;
      if (completedCount === 3) {
        // 3회째면 보상 지급 (포인트 예시)
        const rewardPoint = 500;
        await tx.pointTransaction.create({
          data: {
            userId,
            point: rewardPoint,
            type: 'earned',
            description: `챌린지 ${challengeId} 3회 달성 보상`,
          },
        });
        milestoneRewarded = rewardPoint;
      }

      return {
        completedAt: now,
        completedCount,
        milestoneRewarded,
      };
    });

    return res.success('챌린지 인증 완료', result);
  } catch (err) {
    if (err.message === 'ALREADY_COMPLETED_OR_INVALID') {
      return res.error('이미 완료되었거나 인증 조건이 맞지 않습니다.', 400);
    }
    next(err);
  }
};