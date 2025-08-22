import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

import { 
  BadRequestError, 
  StampbookNotFoundError, 
  ForbiddenError 
} from '../errors/customErrors.js';
import { logger } from "../utils/logger.js";

// 전체 스탬프북 조회
export const getMyStampBooks = async (req, res, next) => {
  const userId = req.user.id;
  const { sortBy } = req.query;

  try {
    let orderByClause;
    if (sortBy === 'mostStamped') {
      orderByClause = [{ currentCount: 'desc' }, { expiresAt: 'asc' }, { id: 'asc' }];
    } else if (!sortBy || sortBy === 'shortestDeadline') {
      orderByClause = [{ expiresAt: 'asc' }, { id: 'asc' }];
    } else {
      return res.fail?.(400, '잘못된 정렬 기준입니다.')
        ?? res.status(400).json({ status: 'FAIL', code: 400, message: '잘못된 정렬 기준입니다.' });
    }

    const stampBooks = await prisma.stampBook.findMany({
      where: { userId, convertedAt: null, expiredAt: null, isCompleted: false },
      include: {
        cafe: {
          select: {
            id: true,
            name: true,
            address: true,
            photos: { orderBy: { displayOrder: 'asc' }, take: 1, select: { photoUrl: true } },
          },
        },
      },
      orderBy: orderByClause,
    });

    const startOfDayKST = (d) => {
      const t = new Date(d);
      const utcMs = t.getTime() + t.getTimezoneOffset() * 60 * 1000;
      const kst = new Date(utcMs + 9 * 60 * 60 * 1000);
      kst.setHours(0,0,0,0);
      return new Date(kst.getTime() - 9 * 60 * 60 * 1000);
    };
    const today0 = startOfDayKST(new Date());

    const items = stampBooks.map((sb) => {
      const expiry0 = startOfDayKST(sb.expiresAt);
      const diffMs = expiry0.getTime() - today0.getTime();
      const daysUntilExpiration = Math.floor(diffMs / 86400000);
      const isExpired = diffMs < 0;
      const isExpiringSoon = diffMs >= 0 && daysUntilExpiration <= 3;

      const remainCount = Math.max(sb.goalCount - sb.currentCount, 0);
      const progressRatio = sb.goalCount > 0 ? sb.currentCount / sb.goalCount : 0;
      const progressPercent = Math.min(100, Math.round(progressRatio * 100));

      return {
        id: sb.id,
        cafe: {
          id: sb.cafe.id,
          name: sb.cafe.name,
          address: sb.cafe.address,
          image: sb.cafe.photos?.[0]?.photoUrl ?? null,
        },
        currentCount: sb.currentCount,
        goalCount: sb.goalCount,
        status: sb.status,
        expiresAt: sb.expiresAt,
        remainCount,
        progressRatio,
        progressPercent,
        isExpired,
        isExpiringSoon,
        daysUntilExpiration,
      };
    });

    const payload = { totalCount: items.length, sortBy: sortBy ?? 'shortestDeadline', items };

    return res.status(200).json({
      status: 'SUCCESS',
      code: 200,
      message: '스탬프북 목록 조회 성공',
      data: payload
    });
  } catch (err) {
    console.error(`스탬프북 리스트 조회 실패: ${err.message}`);
    next(err);
  }
};

// 스탬프북 상세 조회
export const getStampBookDetail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = Number(req.params.stampBookId);
    if (Number.isNaN(stampBookId)) {
      throw new BadRequestError('유효하지 않은 스탬프북 ID입니다.');
    }

    const stampBook = await prisma.stampBook.findFirst({
      where: { id: stampBookId, userId },
      include: {
        cafe: {
          select: {
            id: true, name: true, address: true,
            photos: { orderBy: { displayOrder: 'asc' }, take: 1, select: { photoUrl: true } },
          },
        },
        stamps: {
          orderBy: { stampedAt: 'asc' },
          select: { id: true, stampedAt: true, stampImageUrl: true, source: true, note: true, latitude: true, longitude: true },
        },
      },
    });
    if (!stampBook) throw new StampbookNotFoundError('존재하지 않는 스탬프북입니다.');

    const startOfDayKST = (d) => {
      const t = new Date(d);
      const utc = t.getTime() + t.getTimezoneOffset() * 60000;
      const kst = new Date(utc + 9 * 3600000);
      kst.setHours(0,0,0,0);
      return new Date(kst.getTime() - 9 * 3600000);
    };

    const today0 = startOfDayKST(new Date());
    const expiry0 = stampBook.expiresAt ? startOfDayKST(stampBook.expiresAt) : null;
    const diffMs = expiry0 ? (expiry0 - today0) : null;
    const daysUntilExpiration = diffMs !== null ? Math.floor(diffMs / 86400000) : null;
    const isExpired = diffMs !== null ? diffMs < 0 : false;
    const isExpiringSoon = diffMs !== null ? (diffMs >= 0 && daysUntilExpiration <= 3) : false;

    const data = {
      id: stampBook.id,
      cafe: {
        id: stampBook.cafe.id,
        name: stampBook.cafe.name,
        address: stampBook.cafe.address,
        image: stampBook.cafe.photos?.[0]?.photoUrl ?? null,
      },
      round: stampBook.round,
      goalCount: stampBook.goalCount,
      currentCount: stampBook.currentCount,
      stampsCount: stampBook.stamps.length,
      progressPercent: Math.min(100, Math.round((stampBook.currentCount / stampBook.goalCount) * 100)),
      status: stampBook.status,
      isCompleted: stampBook.isCompleted,
      rewardDetail: stampBook.rewardDetail,
      selectedRewardType: stampBook.selectedRewardType ?? null,
      selectedRewardMeta: stampBook.selectedRewardMeta ?? null,
      startedAt: stampBook.startedAt,
      lastVisitedAt: stampBook.lastVisitedAt,
      expiresAt: stampBook.expiresAt,
      extendedAt: stampBook.extendedAt,
      expiredAt: stampBook.expiredAt,
      completedAt: stampBook.completedAt,
      convertedAt: stampBook.convertedAt,
      createdAt: stampBook.createdAt,
      updatedAt: stampBook.updatedAt,
      stamps: stampBook.stamps,
      isExpiringSoon, isExpired, daysUntilExpiration,
    };

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "스탬프북 상세 조회 성공",
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// 스탬프북 환전
export const convertStampToPoint = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = Number(req.params.stampBookId);
    if (Number.isNaN(stampBookId)) throw new BadRequestError("유효하지 않은 스탬프북 ID입니다.");

    const stampBook = await prisma.stampBook.findUnique({
      where: { id: stampBookId },
      include: { stamps: true, cafe: { select: { id: true, name: true } } },
    });

    if (!stampBook) throw new StampbookNotFoundError("존재하지 않는 스탬프북입니다.");
    if (stampBook.userId !== userId) throw new ForbiddenError("본인의 스탬프북만 환전할 수 있습니다.");
    if (stampBook.isConverted || stampBook.status === "converted") {
      throw new BadRequestError("이미 환전(종료)된 스탬프북입니다.");
    }

    const stampCount = stampBook.stamps.length;
    if (stampCount === 0) throw new BadRequestError("환전 가능한 스탬프가 없습니다.");

    const POINT_PER_STAMP = 2;
    const pointAmount = stampCount * POINT_PER_STAMP;
    const now = new Date();

    await prisma.$transaction([
      prisma.pointTransaction.create({
        data: {
          userId,
          stampBookId,
          point: pointAmount,
          type: "earned",          // enum: PointTransactionType (lowercase)
          description: "스탬프 환전",
        },
      }),
      prisma.stampBook.update({
        where: { id: stampBookId },
        data: {
          convertedAt: now,
          isConverted: true,
          status: "converted",     // enum: StampBookStatus
          currentCount: 0,
        },
      }),
      prisma.stamp.deleteMany({ where: { stampBookId } }), // 정책에 따라 보존하고 싶으면 이 줄 제거
    ]);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: `${stampBook.cafe.name}의 ${stampCount}개의 스탬프가 ${pointAmount}포인트로 환전되었습니다.`,
      data: {
        stampBookId,
        cafeId: stampBook.cafe.id,
        cafeName: stampBook.cafe.name,
        stampCount,
        pointPerStamp: POINT_PER_STAMP,
        pointAmount,
        remainingStampCount: 0,
        convertedAt: now.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// 스탬프북 기간 연장
export const extendStampBook = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = parseInt(req.params.stampBookId, 10);

    if (isNaN(stampBookId)) {
      throw new BadRequestError("유효하지 않은 스탬프북 ID입니다.");
    }

    const stampBook = await prisma.stampBook.findUnique({
      where: { id: stampBookId },
    });

    if (!stampBook) throw new StampbookNotFoundError();
    if (stampBook.userId !== userId)
      throw new ForbiddenError("해당 스탬프북에 대한 권한이 없습니다.");
    if (stampBook.status !== "active")
      throw new BadRequestError("진행 중인 스탬프북만 연장할 수 있습니다.");
    if (stampBook.extendedAt)
      throw new BadRequestError("이미 연장된 스탬프북입니다.");

    const newExpiresAt = new Date(stampBook.expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + 14);

    const updated = await prisma.stampBook.update({
      where: { id: stampBookId },
      data: {
        expiresAt: newExpiresAt,
        extendedAt: new Date(),
      },
    });

    const now = new Date();
    const diffMs = newExpiresAt - now;
    const daysUntilExpiration = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const isExpiringSoon = diffMs > 0 && daysUntilExpiration <= 3;

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "스탬프북이 14일 연장되었습니다.",
      data: {
        stampBookId: updated.id,
        expiresAt: newExpiresAt,    
        extendedAt: updated.extendedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 소멸 임박 스탬프북 조회
export const getExpiringStampBooks = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const startOfDayKST = (d) => {
      const t = new Date(d);
      const utc = t.getTime() + t.getTimezoneOffset() * 60000;
      const kst = new Date(utc + 9 * 3600000);
      kst.setHours(0,0,0,0);
      return new Date(kst.getTime() - 9 * 3600000);
    };
    const today0 = startOfDayKST(new Date());
    const oneWeekLater0 = new Date(today0); oneWeekLater0.setDate(oneWeekLater0.getDate() + 7);

    const expiringBooks = await prisma.stampBook.findMany({
      where: {
        userId,
        status: 'active',
        expiresAt: { gte: today0, lte: oneWeekLater0 },
      },
      include: {
        cafe: {
          select: {
            id: true, name: true, address: true,
            photos: { orderBy: { displayOrder: 'asc' }, take: 1, select: { photoUrl: true } },
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    const data = expiringBooks.map((b) => {
      const goalCount = b.goalCount;
      const currentCount = b.currentCount;
      const progressPercent = Math.min(100, Math.round((currentCount / goalCount) * 100));

      const expiry0 = b.expiresAt ? startOfDayKST(b.expiresAt) : null;
      const diffMs = expiry0 ? (expiry0 - today0) : null;
      const daysUntilExpiration = diffMs !== null ? Math.floor(diffMs / 86400000) : null;
      const isExpired = diffMs !== null ? diffMs < 0 : false;
      const isExpiringSoon = diffMs !== null ? (diffMs >= 0 && daysUntilExpiration <= 3) : false;

      const remain = Math.max(0, goalCount - currentCount);
      const canExtend = !b.isCompleted && daysUntilExpiration !== null && daysUntilExpiration > 0 && daysUntilExpiration <= 7;

      return {
        id: b.id,
        cafe: {
          id: b.cafe.id,
          name: b.cafe.name,
          address: b.cafe.address,
          image: b.cafe.photos?.[0]?.photoUrl ?? null,
        },
        round: b.round,                
        rewardDetail: b.rewardDetail,
        goalCount,
        currentCount,
        progressPercent,
        status: b.status,
        isCompleted: b.isCompleted,
        expiresAt: b.expiresAt,
        daysUntilExpiration,
        isExpiringSoon,
        previewRewardText: `${remain}회 후 포인트로 자동 환전돼요!`,
        canExtend,
      };
    });

    return res.success('소멸 임박 스탬프북 조회 성공', data);
  } catch (err) {
    next(err);
  }
};

// 스탬프 히스토리 조회 (환전/완료)
export const getConvertedStampbooks = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 상태 불일치/레거시를 흡수하기 위해 날짜/플래그도 함께 고려
    const books = await prisma.stampBook.findMany({
      where: {
        userId,
        OR: [
          { status: 'converted' },
          { status: 'completed' },
          { convertedAt: { not: null } },
          { isConverted: true },
          // 완료인데 completedAt만 찍혀 있고 status가 active로 남은 레거시
          { AND: [{ status: 'active' }, { completedAt: { not: null } }] },
        ],
      },
      orderBy: [
        { convertedAt: 'desc' },
        { completedAt: 'desc' },
        { id: 'desc' },
      ],
      include: {
        cafe: {
          select: {
            id: true,
            name: true,
            address: true,
            photos: {
              orderBy: { displayOrder: 'asc' },
              take: 1,
              select: { photoUrl: true },
            },
          },
        },
      },
    });

    // 카페별 그룹핑
    const map = new Map();
    for (const b of books) {
      const cafeId = b.cafe.id;

      if (!map.has(cafeId)) {
        map.set(cafeId, {
          cafeId,
          cafeName: b.cafe.name,
          cafeAddress: b.cafe.address,
          cafeImageUrl: b.cafe.photos?.[0]?.photoUrl ?? null,
          totalCount: 0,
          convertedCount: 0,
          completedCount: 0,
          items: [],
        });
      }

      // 상태 보정 (레거시 호환)
      const isConverted =
        !!b.convertedAt || !!b.isConverted || b.status === 'converted';
      const isCompletedOnly =
        !isConverted && (!!b.completedAt || b.status === 'completed');

      const normalizedStatus = isConverted
        ? 'converted'
        : isCompletedOnly
        ? 'completed'
        : b.status; // 혹시 모를 기타 값

      const group = map.get(cafeId);
      group.totalCount += 1;
      if (normalizedStatus === 'converted') group.convertedCount += 1;
      if (normalizedStatus === 'completed') group.completedCount += 1;

      group.items.push({
        stampBookId: b.id,
        round: b.round,
        status: normalizedStatus,     // 'converted' | 'completed'
        isConverted,                  // 🔴 스웨거에 맞춰 추가
        completedAt: b.completedAt ?? null,
        convertedAt: b.convertedAt ?? null,
        displayText: isConverted
          ? `스탬프지 ${b.round}장 환전 완료`
          : `스탬프지 ${b.round}장 완료`,
        // 정렬 키(내부용) – 나중에 정렬 후 삭제 가능
        _sortAt: b.convertedAt ?? b.completedAt ?? new Date(0),
      });
    }

    // 그룹 내 최신순 정렬 (convertedAt 우선, 없으면 completedAt)
    const result = Array.from(map.values()).map((g) => {
      g.items.sort((a, b) => {
        const ta = new Date(a._sortAt).getTime();
        const tb = new Date(b._sortAt).getTime();
        if (tb !== ta) return tb - ta;
        return b.stampBookId - a.stampBookId;
      });
      // 내부용 키 제거
      g.items = g.items.map(({ _sortAt, ...rest }) => rest);
      return g;
    });

    return (
      res.success?.('히스토리(완료+환전) 조회 성공', result) ??
      res
        .status(200)
        .json({
          status: 'SUCCESS',
          code: 200,
          message: '히스토리(완료+환전) 조회 성공',
          data: result,
        })
    );
  } catch (err) {
    next(err);
  }
};



//   총 스탬프 수 조회
export const getTotalStampCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const total = await prisma.stamp.count({
      where: {
        stampBook: {
          userId,
        },
      },
    });

    return res.success({
      totalStampCount: total,
    });
  } catch (err) {
    next(err);
  }
};

/// 루피 레벨 규칙
const getLoopyLevel = (count) => {
  if (count <= 3)  return { level: 1, label: '호기심 많은 탐색가', nextTarget: 4 };
  if (count <= 9)  return { level: 2, label: '차곡차곡 쌓는 수집가', nextTarget: 10 };
  if (count <= 19) return { level: 3, label: '동네 카페 전문가',   nextTarget: 20 };
  return { level: 4, label: '카페왕 루피', nextTarget: null };
};

export const getLoopyLevelInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const stampBookCount = await prisma.stampBook.count({
      where: { userId },
    });

    const { level, label, nextTarget } = getLoopyLevel(stampBookCount);
    const remainingToNext =
      nextTarget === null ? null : Math.max(0, nextTarget - stampBookCount);

    return res.status(200).json({
      status: 'SUCCESS',
      code: 200,
      message: '루피 레벨 조회 성공',
      data: {
        stampBookCount,   
        level,            
        label,            
        nextTarget,       
        remainingToNext, 
      },
    });
  } catch (err) {
    next(err);
  }
};


// 특정 카페에 대한 내 스탬프북 현황 조회
export const getMyStampByCafe = async (req, res, next) => {
  const userId = req.user.id;
  const cafeId = parseInt(req.params.cafeId);

  try {
    const stampbook = await prisma.stampBook.findFirst({
      where: {
        userId,
        cafeId,
        isConverted: false,
      },
      select: {
        id: true,
        currentCount: true,
        goalCount: true,
        expiresAt: true,
      },
    });

    if (!stampbook) {
      return res.status(404).json({
        resultType: 'FAIL',
        error: '해당 카페에 대한 스탬프북이 없습니다.',
        success: null,
      });
    }

    return res.status(200).json({
      resultType: 'SUCCESS',
      error: null,
      success: {
        stampBookId: stampbook.id,
        currentCount: stampbook.currentCount,
        goalCount: stampbook.goalCount,
        expiresAt: stampbook.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}