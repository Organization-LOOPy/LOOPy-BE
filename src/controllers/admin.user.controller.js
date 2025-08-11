import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 전화번호로 고객 정보 조회
export const getUserByPhone = async (req, res, next) => {
  const phone = req.query.phone;

  try {
    if (!phone) {
      return res.fail('전화번호 입력 누락', 400);
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        nickname: true,
        stamps: { select: { id: true } },
        pointTransactions: {
          where: { type: 'EARNED' },
          select: { amount: true }
        },
        stampBooks: {
          where: {
            convertedAt: null,
            expiredAt: null,
            isCompleted: false
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return res.fail('해당 전화번호의 고객을 찾을 수 없습니다.', 404);
    }

    const totalStampCount = user.stamps.length;
    const totalPoint = user.pointTransactions.reduce((acc, cur) => acc + cur.amount, 0);
    const stampBook = user.stampBooks[0];

    return res.success('고객 정보 조회 성공', {
      userId: user.id,
      nickname: user.nickname,
      stamp: {
        totalCount: totalStampCount,
        currentStampBook: stampBook
          ? {
              stampBookId: stampBook.id,
              currentCount: stampBook.currentCount,
              goalCount: stampBook.goalCount
            }
          : null
      },
      point: {
        total: totalPoint
      }
    });
  } catch (err) {
    next(err);
  }
};

export const addStampToUser = async (req, res, next) => {
    const userId = parseInt(req.params.userId, 10);
    const cafeId = req.user.cafeId;
  
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.fail('존재하지 않는 사용자입니다.', 404);
      }
  
      let stampBook = await prisma.stampBook.findFirst({
        where: {
          userId,
          cafeId,
          convertedAt: null,
          expiredAt: null,
          isCompleted: false,
        },
        orderBy: { createdAt: 'desc' },
      });
  
      if (!stampBook) {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(now.getDate() + 14);
  
        stampBook = await prisma.stampBook.create({
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
  
      const updatedStampBook = await prisma.stampBook.update({
        where: { id: stampBook.id },
        data: {
          currentCount: { increment: 1 },
        },
      });
  
      await prisma.stamp.create({
        data: {
          userId,
          cafeId,
          stampBookId: stampBook.id,
          method: 'MANUAL',
        },
      });
  
      return res.success('스탬프 적립 완료', {
        stampBookId: updatedStampBook.id,
        currentCount: updatedStampBook.currentCount,
        goalCount: updatedStampBook.goalCount,
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
        return res.fail('QR 토큰이 필요합니다.', 400);
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
        return res.fail('해당 QR의 고객 정보를 찾을 수 없습니다.', 404);
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
        return res.fail('사용할 포인트 금액이 올바르지 않습니다.', 400);
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
        return res.fail('사용 가능한 쿠폰이 없습니다.', 404);
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
        return res.fail('챌린지 참여 이력이 없습니다.', 404);
      }
  
      if (participation.completedAt) {
        return res.fail('이미 완료된 챌린지입니다.', 400);
      }
  
      if (participation.joinedCafeId !== cafeId) {
        return res.fail('해당 카페에서 인증할 수 없는 챌린지입니다.', 403);
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
en  