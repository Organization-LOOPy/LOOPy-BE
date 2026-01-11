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
const to82Variant = (digits) => (digits.startsWith('0') ? `82${digits.slice(1)}` : digits);
const toLocalKR = (digits) => (digits.startsWith('82') && digits.length === 12 ? `0${digits.slice(2)}` : digits);

// 전화번호 고객 조회
export const getUserByPhone = async (req, res, next) => {
  try {
    // 1) 카페 ID 확보 (OWNER fallback)
    let cafeId = req.user.cafeId;
    if (!cafeId && req.user.roles?.includes('OWNER')) {
      const ownerCafe = await prisma.cafe.findFirst({ where: { ownerId: req.user.id }, select: { id: true } });
      cafeId = ownerCafe?.id;
    }

    const rawPhone = req.query.phone;
    if (!rawPhone) return res.error({ reason: '전화번호 입력 누락' });
    if (!cafeId)  return res.error({ reason: '카페 ID 정보가 없습니다.' });

    const digits = normalizePhone(rawPhone);
    const alt82  = to82Variant(digits);

    const { user, sb } = await prisma.$transaction(async (tx) => {
      // 2-1) 기존 회원 조회 (하이픈/공백/국가코드 제거 비교)
      const rows = await tx.$queryRawUnsafe(
        `
        SELECT id, nickname, phone_number AS phoneNumber, created_at
        FROM users
        WHERE REPLACE(REPLACE(REPLACE(phone_number, '-', ''), ' ', ''), '+', '') IN (?, ?)
        ORDER BY
          CASE WHEN nickname LIKE '손님-____' THEN 1 ELSE 0 END ASC,
          created_at ASC
        LIMIT 1
        `,
        digits, alt82
      );
      const user = Array.isArray(rows) && rows[0] ? rows[0] : null;
      if (!user) {
        return Promise.reject({ code: 'USER_NOT_FOUND', message: '해당 번호의 회원을 찾을 수 없습니다.' });
      }

      // 2-2) 진행중 스탬프북 조회
      let sb = await tx.stampBook.findFirst({
        where: { userId: user.id, cafeId, convertedAt: null, expiredAt: null, isCompleted: false, status: 'active' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, currentCount: true, goalCount: true, expiresAt: true },
      });

      // 2-3) 없으면 생성 (✅ goal=10 고정, 만료 30일 고정)
      if (!sb) {
        const policy = await tx.stampPolicy.findUnique({
          where: { cafeId },
          include: { menu: { select: { name: true } } },
        });

        const DEFAULT_BOOK_GOAL = 10;
        const goalCount = DEFAULT_BOOK_GOAL; // ✅ 정책과 무관하게 스탬프북 목표는 10

        // 리워드 표기
        let rewardDetail = '리워드 제공';
        if (policy) {
          switch (policy.rewardType) {
            case 'DISCOUNT':   rewardDetail = policy.discountAmount ? `${policy.discountAmount}원 할인` : '할인 리워드'; break;
            case 'SIZE_UP':    rewardDetail = '사이즈 업 1회'; break;
            case 'FREE_DRINK': rewardDetail = '무료 음료 1잔'; break;
          }
        }

        const now = new Date();
        const EXPIRE_DAYS = 30;
        const expiresAt = new Date(now.getTime() + EXPIRE_DAYS * 24 * 60 * 60 * 1000);

        // 라운드 = 이 카페 최대 + 1
        const lastRound = await tx.stampBook.findFirst({
          where: { userId: user.id, cafeId },
          orderBy: { round: 'desc' },
          select: { round: true },
        });
        const nextRound = (lastRound?.round ?? 0) + 1;

        try {
          sb = await tx.stampBook.create({
            data: {
              userId: user.id,
              cafeId,
              currentCount: 0,
              goalCount,
              rewardDetail,
              selectedRewardType: policy?.rewardType ?? null,
              selectedRewardMeta: policy ? { conditionType: policy.conditionType, menuId: policy.menuId ?? null } : null,
              startedAt: now,
              expiresAt,
              status: 'active',
              isCompleted: false,
              isConverted: false,
              round: nextRound,
            },
            select: { id: true, currentCount: true, goalCount: true, expiresAt: true },
          });
        } catch {
          sb = await tx.stampBook.findFirst({
            where: { userId: user.id, cafeId, convertedAt: null, expiredAt: null, isCompleted: false, status: 'active' },
            orderBy: { createdAt: 'desc' },
            select: { id: true, currentCount: true, goalCount: true, expiresAt: true },
          });
        }
      }

      return { user, sb };
    });

    // 3) (카페 기준) 집계
    // 3) (내 카페 기준) 집계 — ‘진행 중’ 스탬프북 개수만
    const [cafeStampCount, cafeStampBookCount] = await Promise.all([
      prisma.stamp.count({
        where: { stampBook: { userId: user.id, cafeId } },
      }),
      prisma.stampBook.count({
        where: {
          userId: user.id,
          cafeId,
          convertedAt: null,
          expiredAt: null,
          isCompleted: false,
          status: 'active',
        },
      }),
    ]);


    // 4) 카페 참여중 챌린지
    const today = new Date();
    const myChallengesAtCafe = await prisma.challengeParticipant.findMany({
      where: {
        userId: user.id, status: 'in_progress', joinedCafeId: cafeId,
        challenge: { isActive: true, startDate: { lte: today }, endDate: { gte: today } },
      },
      select: {
        challengeId: true, joinedAt: true,
        challenge: { select: { id: true, title: true, goalCount: true, rewardPoint: true, endDate: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });
    const challengeIdsAtCafe = myChallengesAtCafe.map(c => c.challengeId);
    const challengeSummaries = myChallengesAtCafe.map(c => ({
      challengeId: c.challenge.id, title: c.challenge.title, goalCount: c.challenge.goalCount,
      rewardPoint: c.challenge.rewardPoint, endDate: c.challenge.endDate, joinedAt: c.joinedAt,
    }));

    // 5) 포인트(통합)
    const [earnedAgg, spentAgg, refundedAgg] = await Promise.all([
      prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'earned' }, _sum: { point: true } }),
      prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'spent' }, _sum: { point: true } }),
      prisma.pointTransaction.aggregate({ where: { userId: user.id, type: 'refunded' }, _sum: { point: true } }),
    ]);
    const totalPoint = (earnedAgg._sum.point ?? 0) + (refundedAgg._sum.point ?? 0) - (spentAgg._sum.point ?? 0);

    // 6) 진행률/남은 일수
    const progressRate = Math.floor((sb.currentCount / sb.goalCount) * 100);
    const daysLeft = Math.max(0, Math.ceil((new Date(sb.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    // 7) 액션 토큰
    const actionToken = signActionToken({ userId: user.id, cafeId, scope: 'ADD_STAMP', ttlSec: 600 });

    // 8) 응답
    const displayPhone = formatPhoneDisplay(toLocalKR(normalizePhone(user.phoneNumber || digits)));
    return res.success({
      userId: user.id,
      nickname: user.nickname,
      phone: displayPhone,
      stamp: {
        totalCount: cafeStampCount,
        stampBookCount: cafeStampBookCount,
        currentStampBook: {
          stampBookId: sb.id, currentCount: sb.currentCount, goalCount: sb.goalCount,
          progressRate, expiresAt: sb.expiresAt, daysLeft,
        },
      },
      challenge: { inProgressAtCafeIds: challengeIdsAtCafe, inProgressAtCafe: challengeSummaries },
      point: { total: totalPoint },
      actionToken,
    });
  } catch (err) {
    return res.error({ errorCode: err?.code || 'UNKNOWN', reason: err?.message || '알 수 없는 오류가 발생했습니다.', data: null });
  }
};




// 스탬프 적립 (리팩토링)
export const addStampToUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    // 0) 액션 토큰 필수 + 일치성 검증
    const t = req.actionToken;
    if (!t) {
      return res.error(
        { errorCode: 'ACTION_TOKEN_REQUIRED', reason: 'x-action-token 이 필요합니다.', data: null },
        401
      );
    }
    if (t.scope !== 'ADD_STAMP') {
      return res.error(
        { errorCode: 'ACTION_TOKEN_SCOPE_INVALID', reason: '허용되지 않은 스코프입니다.', data: null },
        403
      );
    }

    // 하위호환: 과거 토큰(userId)도 허용
    const tokenUserId = Number(t?.sub ?? t?.userId);
    if (!Number.isInteger(userId) || !Number.isInteger(tokenUserId) || tokenUserId !== userId) {
      console.warn('[ADD_STAMP] user mismatch', { tokenUserId, pathUserId: userId, jti: t?.jti });
      return res.error(
        {
          errorCode: 'ACTION_TOKEN_USER_MISMATCH',
          reason: `토큰 user=${t?.sub ?? t?.userId}, 요청 user=${userId} 불일치`,
          data: null,
        },
        403
      );
    }

    // 1) 카페 ID 확보 (OWNER fallback)
    let cafeId = Number(req.user?.cafeId);
    if (!cafeId && req.user.roles?.includes('OWNER')) {
      const ownerCafe = await prisma.cafe.findFirst({
        where: { ownerId: req.user.id },
        select: { id: true },
      });
      cafeId = ownerCafe?.id;
    }
    if (!cafeId) {
      return res.error(
        { errorCode: 'CAFE_REQUIRED', reason: '사장님 토큰에 카페 정보가 없습니다.', data: null },
        403
      );
    }
    if (Number(t.cafeId) !== Number(cafeId)) {
      console.warn('[ADD_STAMP] cafe mismatch', { tokenCafeId: Number(t.cafeId), cafeId });
      return res.error(
        {
          errorCode: 'ACTION_TOKEN_CAFE_MISMATCH',
          reason: `토큰 cafeId=${t.cafeId}, 요청 cafeId=${cafeId} 불일치`,
          data: null,
        },
        403
      );
    }

    // 2) 사용자 존재 확인
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return res.error(
        { errorCode: 'USER_NOT_FOUND', reason: '존재하지 않는 사용자입니다.', data: null },
        404
      );
    }

    // 3) 트랜잭션
    const EXPIRE_DAYS = 30;
    let updatedBook;

    await prisma.$transaction(async (tx) => {
      // (1) 진행중 스탬프북
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

      // (2) 없으면 생성 (goal=10, 만료 30일 고정)
      if (!book) {
        const policy = await tx.stampPolicy.findUnique({
          where: { cafeId },
          include: { menu: { select: { name: true } } },
        });

        const DEFAULT_BOOK_GOAL = 10;
        const goalCount = DEFAULT_BOOK_GOAL;

        let rewardDetail = '리워드 제공';
        if (policy) {
          switch (policy.rewardType) {
            case 'DISCOUNT':
              rewardDetail = policy.discountAmount ? `${policy.discountAmount}원 할인` : '할인 리워드';
              break;
            case 'SIZE_UP':
              rewardDetail = '사이즈 업 1회';
              break;
            case 'FREE_DRINK':
              rewardDetail = '무료 음료 1잔';
              break;
          }
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + EXPIRE_DAYS * 24 * 60 * 60 * 1000);

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
            goalCount,
            isCompleted: false,
            isConverted: false,
            startedAt: now,
            status: 'active',
            expiresAt,
            rewardDetail,
            selectedRewardType: policy?.rewardType ?? null,
            selectedRewardMeta: policy
              ? { conditionType: policy.conditionType, menuId: policy.menuId ?? null }
              : null,
            round: nextRound,
          },
        });
      }

      const now = new Date();

      // (3) 목표 미만일 때만 증가(동시성 안전)
      const inc = await tx.stampBook.updateMany({
        where: {
          id: book.id,
          isCompleted: false,
          status: 'active',
          currentCount: { lt: book.goalCount },
        },
        data: { currentCount: { increment: 1 }, lastVisitedAt: now },
      });
      if (inc.count === 0) {
        throw Object.assign(new Error('GOAL_EXCEEDED'), { code: 'GOAL_EXCEEDED' });
      }

      // (4) 스탬프 레코드 생성
      await tx.stamp.create({
        data: { stampBookId: book.id, stampedAt: now, source: 'owner', method: 'MANUAL' },
      });

      // (5) 재조회
      updatedBook = await tx.stampBook.findUnique({
        where: { id: book.id },
        select: { id: true, currentCount: true, goalCount: true, isCompleted: true, status: true },
      });

      // (6) 목표 도달 시 완료 처리
      // (6) 목표 도달 시 완료 처리 + 쿠폰 발급 + 다음 스탬프북 생성
      if (!updatedBook.isCompleted && updatedBook.currentCount >= updatedBook.goalCount) {
        // 6-1) 스탬프 정책 조회
        const policy = await tx.stampPolicy.findUnique({ where: { cafeId } });
        if (!policy) {
          throw Object.assign(new Error('STAMP_POLICY_NOT_FOUND'), { code: 'STAMP_POLICY_NOT_FOUND' });
        }

        const now = new Date();
        const couponExpiredAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        // 6-2) 쿠폰 템플릿 생성
        const couponTemplate = await tx.couponTemplate.create({
          data: {
            cafeId,
            name: policy.rewardDescription || '스탬프 리워드 쿠폰',
            discountType: policy.rewardType,
            discountValue: policy.discountAmount ?? 0,
            applicableMenuId: policy.menuId ?? null,
            isActive: true,
            expiredAt: policy.hasExpiry ? policy.rewardExpiresAt : couponExpiredAt,
          },
        });

        // 6-3) 사용자 쿠폰 발급
        await tx.userCoupon.create({
          data: {
            userId,
            couponTemplateId: couponTemplate.id,
            acquisitionType: 'stamp',
            status: 'active',
            issuedAt: now,
            expiredAt: couponExpiredAt,
          },
        });

        // 6-4) 스탬프북 완료 처리
        await tx.stampBook.update({
          where: { id: book.id },
          data: {
            isCompleted: true,
            completedAt: now,
            status: 'completed',
          },
        });

        // 6-5) 다음 스탬프북 생성 (자동 라운드 증가)
        await tx.stampBook.create({
          data: {
            userId,
            cafeId,
            currentCount: 0,
            goalCount: book.goalCount,
            isCompleted: false,
            isConverted: false,
            startedAt: now,
            status: 'active',
            expiresAt: new Date(now.getTime() + EXPIRE_DAYS * 24 * 60 * 60 * 1000),
            rewardDetail: book.rewardDetail,
            selectedRewardType: book.selectedRewardType,
            selectedRewardMeta: book.selectedRewardMeta,
            round: book.round + 1,
          },
        });

        updatedBook = {
          ...updatedBook,
          isCompleted: true,
          status: 'completed',
        };
      }
    });

    // 4) jti 사용 처리
    if (req.actionToken?.jti) await markJtiUsed(req.actionToken.jti);

    // 5) 응답
    return res.success({
      usedCafeId: cafeId,
      stampBookId: updatedBook.id,
      currentCount: updatedBook.currentCount,
      goalCount: updatedBook.goalCount,
      isCompleted: updatedBook.isCompleted,
    });
  } catch (err) {
    if (err?.code === 'GOAL_EXCEEDED') {
      return res.error(
        {
          errorCode: 'STAMPBOOK_ALREADY_COMPLETED',
          reason: '이미 목표를 달성한 스탬프북입니다.',
          data: null,
        },
        409
      );
    }
    next(err);
  }
};





// 고객 QR 인증 (안정화 버전)
export const verifyQRToken = async (req, res, next) => {
  try {
    const rawUserId = req.body?.userId;
    const userId = Number(rawUserId);
    const cafeId = req.user?.cafeId;

    if (!Number.isInteger(userId)) {
      return res.error(
        { errorCode: 'BAD_REQUEST', reason: 'userId가 필요하며 숫자여야 합니다.', data: null },
        400,
      );
    }
    if (!cafeId) {
      return res.error(
        { errorCode: 'CAFE_REQUIRED', reason: '사장님 토큰에 카페 정보가 없습니다.', data: null },
        403,
      );
    }

    const now = new Date();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        stampBooks: {
          where: { cafeId, convertedAt: null, expiredAt: null, isCompleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, currentCount: true, goalCount: true },
        },
        // ✅ userCoupons → coupons 로 수정
        coupons: {
          where: {
            usedAt: null,
            expiredAt: { gte: now },
            // 스키마상 관계명은 couponTemplate 이 맞음
            couponTemplate: { is: { cafeId } },
          },
          select: {
            id: true,
            expiredAt: true,
            couponTemplate: { select: { name: true, usageCondition: true } },
          },
        },
      },
    });

    if (!user) {
      return res.error(
        { errorCode: 'USER_NOT_FOUND', reason: '해당 고객 정보를 찾을 수 없습니다.', data: null },
        404,
      );
    }

    // ✅ enum은 소문자: PointTransactionType.earned / .spent / .refunded
    const [totalStampCount, earnedAgg, spentAgg, refundedAgg, activeChallenges] = await Promise.all([
      prisma.stamp.count({ where: { stampBook: { userId: user.id } } }),
      prisma.pointTransaction.aggregate({
        where: { userId: user.id, type: PointTransactionType.earned },
        _sum: { point: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId: user.id, type: PointTransactionType.spent },
        _sum: { point: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId: user.id, type: PointTransactionType.refunded },
        _sum: { point: true },
      }),
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
        select: { challenge: { select: { id: true, title: true, endDate: true } } },
      }),
    ]);

    const totalPoint =
      (earnedAgg._sum.point ?? 0) + (refundedAgg._sum.point ?? 0) - (spentAgg._sum.point ?? 0);

    const currentStampBook = user.stampBooks[0] ?? null;

    // ✅ user.userCoupons → user.coupons
    const availableCoupons = user.coupons.map((uc) => ({
      userCouponId: uc.id,
      name: uc.couponTemplate?.name ?? '',
      usageCondition: uc.couponTemplate?.usageCondition ?? null,
      expiredAt: uc.expiredAt,
    }));

    const ongoingChallenges = activeChallenges.map(({ challenge }) => ({
      challengeId: challenge.id,
      title: challenge.title,
      expiredAt: challenge.endDate,
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
    console.error('[verifyQRToken]', err);
    // res.error가 status를 제대로 반영하지 않는 듯하니 명시적으로 500 내려주자.
    return res.status(500).json({
      resultType: 'FAIL',
      error: { errorCode: 'INTERNAL_ERROR', reason: '서버 오류', data: null },
      success: null,
    });
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

// 챌린지 인증 (goalCount 도달 시 완료 처리 + 보상)
export const verifyChallengeForUser = async (req, res, next) => {
  const userId = Number(req.params.userId);
  const challengeId = Number(req.params.challengeId);
  const cafeId = req.user?.cafeId;

  try {
    if (!cafeId) return res.error('사장님 토큰에 카페 정보가 없습니다.', 403);
    const now = new Date();

    // 1) 참여 정보 + 챌린지 정보 조회
    const participant = await prisma.challengeParticipant.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      select: {
        completedAt: true,
        joinedCafeId: true,
        currentCount: true,
        challenge: {
          select: { goalCount: true, rewardPoint: true, title: true }
        }
      },
    });

    if (!participant) return res.error('챌린지 참여 이력이 없습니다.', 404);
    if (participant.completedAt) return res.error('이미 완료된 챌린지입니다.', 400);
    if (participant.joinedCafeId !== cafeId) return res.error('해당 카페에서 인증할 수 없는 챌린지입니다.', 403);

    const goalCount = participant.challenge.goalCount;
    const currentCount = participant.currentCount;

    // 이미 목표 횟수에 도달한 경우
    if (currentCount >= goalCount) {
      return res.error('이미 목표 횟수에 도달했습니다.', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const newCount = currentCount + 1;
      const isCompleted = newCount >= goalCount;

      // 2) 인증 횟수 증가 (+ 완료 시 상태 변경)
      await tx.challengeParticipant.update({
        where: { userId_challengeId: { userId, challengeId } },
        data: {
          currentCount: newCount,
          ...(isCompleted && { completedAt: now, status: 'completed' })
        },
      });

      let milestoneRewarded = 0;
      let couponId = null;

      // 3) 목표 달성 시 보상 지급
      if (isCompleted) {
        const rewardPoint = participant.challenge.rewardPoint || 500;

        // 포인트 지급
        await tx.pointTransaction.create({
          data: {
            userId,
            point: rewardPoint,
            type: 'earned',
            description: `챌린지 "${participant.challenge.title}" 완료 보상`,
          },
        });
        milestoneRewarded = rewardPoint;

        // 쿠폰 발급 (활성화된 템플릿이 있는 경우)
        const template = await tx.couponTemplate.findFirst({
          where: { isActive: true, expiredAt: { gte: now } },
          orderBy: { expiredAt: 'asc' },
        });

        if (template) {
          const coupon = await tx.userCoupon.create({
            data: {
              userId,
              couponTemplateId: template.id,
              acquisitionType: 'promotion',
              expiredAt: new Date(now.getTime() + (template.validDays || 14) * 24 * 60 * 60 * 1000),
            },
          });
          couponId = coupon.id;
        }
      }

      return {
        currentCount: newCount,
        goalCount,
        isCompleted,
        completedAt: isCompleted ? now : null,
        milestoneRewarded,
        couponId,
      };
    });

    const message = result.isCompleted
      ? '챌린지 완료! 보상이 지급되었습니다.'
      : `챌린지 인증 완료 (${result.currentCount}/${result.goalCount})`;

    return res.success(message, result);
  } catch (err) {
    next(err);
  }
};