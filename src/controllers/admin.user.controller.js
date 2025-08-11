import { PrismaClient } from '@prisma/client';
import { PointTransactionType } from '@prisma/client';
const prisma = new PrismaClient();

import { signActionToken } from '../utils/actionToken.js';

const normalizePhone = (v = '') => v.replace(/\D/g, '');
const formatPhoneDisplay = (digits) => {
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
};

export const getUserByPhone = async (req, res, next) => {
  let cafeId = req.user.cafeId;

  if (!cafeId && req.user.roles?.includes("OWNER")) {
    const ownerCafe = await prisma.cafe.findFirst({
      where: { ownerId: req.user.id },
      select: { id: true },
    });
    cafeId = ownerCafe?.id;
  }

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
      purpose: 'ADD_STAMP',
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

export const addStampToUser = async (req, res, next) => {
  const userId = parseInt(req.params.userId, 10);
  const cafeId = req.user.cafeId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return res.error({
        errorCode: "USER_NOT_FOUND",
        reason: "존재하지 않는 사용자입니다.",
        data: null,
      });
    }

    let result;
    let goalExceeded = false;

    await prisma.$transaction(async (tx) => {
      // 최신 진행 중 스탬프북
      let stampBook = await tx.stampBook.findFirst({
        where: {
          userId,
          cafeId,
          convertedAt: null,
          expiredAt: null,
          isCompleted: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      // 없으면 생성 (14일 만료)
      if (!stampBook) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        stampBook = await tx.stampBook.create({
          data: {
            userId,
            cafeId,
            currentCount: 0,
            goalCount: 10,
            isCompleted: false,
            isConverted: false,
            expiresAt,
          },
        });
      }

      // 목표 초과 방지
      if (stampBook.currentCount >= stampBook.goalCount) {
        goalExceeded = true;
        return; // 트랜잭션 종료
      }

      // 스탬프 1개 생성
      await tx.stamp.create({
        data: {
          userId,
          cafeId,
          stampBookId: stampBook.id,
          method: 'MANUAL',
        },
      });

      const newCount = stampBook.currentCount + 1;
      const isCompleted = newCount >= stampBook.goalCount;

      result = await tx.stampBook.update({
        where: { id: stampBook.id },
        data: {
          currentCount: newCount,
          lastVisitedAt: new Date(),
          ...(isCompleted
            ? { isCompleted: true, completedAt: new Date(), status: 'completed' }
            : {}),
        },
        select: { id: true, currentCount: true, goalCount: true, isCompleted: true },
      });
    });

    if (goalExceeded) {
      return res.error({
        errorCode: "STAMPBOOK_ALREADY_COMPLETED",
        reason: "이미 목표를 달성한 스탬프북입니다.",
        data: null,
      });
    }

    // 액션 토큰 소모 처리
    if (req.actionToken?.jti) {
      await markJtiUsed(req.actionToken.jti);
    }

    return res.success({
      stampBookId: result.id,
      currentCount: result.currentCount,
      goalCount: result.goalCount,
      isCompleted: result.isCompleted,
    });

  } catch (err) {
    next(err);
  }
};

  


// QR 스캔으로 고객 정보 확인
export const verifyQRToken = async (req, res, next) => {
    const { qrToken } = req.body;
    const cafeId = req.user.cafeId;
  
    try {
      if (!qrToken) {
        return res.error('QR 토큰이 필요합니다.', 400);
      }
  
      const user = await prisma.user.findUnique({
        where: { qrToken },
        select: {
          id: true,
          nickname: true,
          stamps: { select: { id: true } },
          pointTransactions: {
            where: { type: 'EARNED' },
            select: { amount: true },
          },
          stampBooks: {
            where: {
              cafeId,
              convertedAt: null,
              expiredAt: null,
              isCompleted: false,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          userCoupons: {
            where: {
              usedAt: null,
              expiredAt: { gte: new Date() },
            },
            include: { couponTemplate: true },
          },
        },
      });
  
      if (!user) {
        return res.error('해당 QR의 고객 정보를 찾을 수 없습니다.', 404);
      }
  
      const activeChallenges = await prisma.challengeParticipant.findMany({
        where: {
          userId: user.id,
          completedAt: null,
        },
        include: {
          challenge: true,
        },
      });
  
      const totalStampCount = user.stamps.length;
      const totalPoint = user.pointTransactions.reduce((acc, cur) => acc + cur.amount, 0);
      const currentStampBook = user.stampBooks[0];

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
  
      return res.success('QR 인증 성공', {
        userId: user.id,
        nickname: user.nickname,
        stamp: {
          totalCount: totalStampCount,
          currentStampBook: currentStampBook
            ? {
                stampBookId: currentStampBook.id,
                currentCount: currentStampBook.currentCount,
                goalCount: currentStampBook.goalCount,
              }
            : null,
        },
        point: {
          total: totalPoint,
        },
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