import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

import { StampbookNotFoundError } from "../errors/customErrors.js";
import { BadRequestError } from '../errors/customErrors.js';

// 전체 스탬프북 조회
export const getMyStampBooks = async (req, res, next) => {
  const userId = req.user.id;
  const { sortBy } = req.query;

  try {
    // 1) 정렬
    let orderByClause;
    if (sortBy === 'mostStamped') {
      orderByClause = [{ currentCount: 'desc' }, { expiresAt: 'asc' }, { id: 'asc' }];
    } else if (!sortBy || sortBy === 'shortestDeadline') {
      orderByClause = [{ expiresAt: 'asc' }, { id: 'asc' }];
    } else {
      return res.fail?.(400, '잘못된 정렬 기준입니다.')
        ?? res.status(400).json({ status: 'FAIL', code: 400, message: '잘못된 정렬 기준입니다.' });
    }

    // 2) 조회
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

    // 3) KST 00:00
    const startOfDayKST = (d) => {
      const t = new Date(d);
      const utcMs = t.getTime() + t.getTimezoneOffset() * 60 * 1000;
      const kst = new Date(utcMs + 9 * 60 * 60 * 1000);
      kst.setHours(0,0,0,0);
      return new Date(kst.getTime() - 9 * 60 * 60 * 1000);
    };
    const today0 = startOfDayKST(new Date());

    // 4) 매핑
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

    return res.success?.(payload)
      ?? res.status(200).json({ status: 'SUCCESS', code: 200, message: '스탬프북 목록 조회 성공', data: payload });
  } catch (err) {
    (logger?.error ?? console.error)(`스탬프북 리스트 조회 실패: ${err.message}`);
    next(err);
  }
};

// 스탬프북 상세 조회
export const getStampBookDetail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = Number(req.params.stampBookId);
    if (isNaN(stampBookId)) throw new BadRequestError('유효하지 않은 스탬프북 ID입니다.');

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
    if (!stampBook) throw new NotFoundError('존재하지 않는 스탬프북입니다.');

    const startOfDayKST = (d) => {
      const t = new Date(d);
      const utc = t.getTime() + t.getTimezoneOffset() * 60000;
      const kst = new Date(utc + 9 * 3600000);
      kst.setHours(0,0,0,0);
      return new Date(kst.getTime() - 9 * 3600000);
    };

    const today0 = startOfDayKST(new Date());
    const expiry0 = startOfDayKST(stampBook.expiresAt);
    const diffMs = expiry0 - today0;
    const daysUntilExpiration = Math.floor(diffMs / 86400000);
    const isExpired = diffMs < 0;
    const isExpiringSoon = diffMs >= 0 && daysUntilExpiration <= 3;

    const currentCount = stampBook.currentCount;
    const stampsCount = stampBook.stamps.length;
    const progressPercent = Math.min(100, Math.round((currentCount / stampBook.goalCount) * 100));

    const reward = {
      type: stampBook.selectedRewardType ?? null,  
      meta: stampBook.selectedRewardMeta ?? null,   
      detailText: stampBook.rewardDetail ?? '',     
      selectable: false,                            
    };

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
      currentCount,
      stampsCount,
      progressPercent,
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
  } catch (err) {
    next(err);
  }
};

// 스탬프북 환전
export const convertStampToPoint = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = Number(req.params.stampBookId);
    if (Number.isNaN(stampBookId)) {
      throw new BadRequestError("유효하지 않은 스탬프북 ID입니다.");
    }

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
      prisma.user.update({
        where: { id: userId },
        data: { totalPoint: { increment: pointAmount } },
      }),
      prisma.pointTransaction.create({
        data: {
          userId,
          stampBookId,
          point: pointAmount,
          type: "earned",
          description: "스탬프 환전",
        },
      }),
      prisma.stamp.deleteMany({
        where: { stampBookId },
      }),
      prisma.stampBook.update({
        where: { id: stampBookId },
        data: { lastConvertedAt: now },
      }),
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
        newExpiresAt,
        extendedAt: updated.extendedAt,
        daysUntilExpiration,
        isExpiringSoon,
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
    const today = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(today.getDate() + 7);

    const expiringBooks = await prisma.stampBook.findMany({
      where: {
        userId,
        status: 'active',
        expiresAt: {
          gte: today,
          lte: oneWeekLater,
        },
      },
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
        stamps: {
          select: { id: true },
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });

    const result = expiringBooks.map((book) => {
      const goalCount = book.goalCount;
      const currentCount = book.stamps.length;
      const progressRate = Math.floor((currentCount / goalCount) * 100);

      const expiresAt = new Date(book.expiresAt);
      const todayMidnight = new Date(today.toDateString());
      const daysLeft = Math.ceil((expiresAt - todayMidnight) / (1000 * 60 * 60 * 24));

      const isCompleted = book.isCompleted;
      const canExtend = !isCompleted && daysLeft <= 7 && daysLeft > 0;
      const previewRewardText = `${goalCount - currentCount}회 후 포인트로 자동 환전돼요!`;

      const imageUrl = book.cafe.photos?.[0]?.photoUrl || null;

      return {
        stampBookId: book.id,
        cafeId: book.cafe.id,
        cafeName: book.cafe.name,
        cafeAddress: book.cafe.address,
        cafeImageUrl: imageUrl,
        expiresAt: book.expiresAt,
        daysLeft,
        currentCount,
        goalCount,
        progressRate,
        isCompleted,
        canExtend,
        previewRewardText,
      };
    });

    return res.success(result);
  } catch (error) {
    console.error('[getExpiringStampBooks ERROR]', error);
    next(error);
  }
};


//   [기능 8] 스탬프 히스토리 조회 (환전 완료된 스탬프북)
export const getConvertedStampbooks = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const convertedBooks = await prisma.stampBook.findMany({
      where: {
        userId,
        status: 'converted',
      },
      orderBy: {
        convertedAt: 'desc',
      },
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

    const result = convertedBooks.map((book) => {
      const cafe = book.cafe;
      const imageUrl = cafe.photos[0]?.photoUrl || null;

      return {
        stampBookId: book.id,
        cafeId: cafe.id,
        cafeName: cafe.name,
        cafeAddress: cafe.address,
        cafeImageUrl: imageUrl,
        round: book.round,
        displayText: `스탬프지 ${book.round}장 완료`,
        convertedAt: book.convertedAt,
      };
    });

    return res.success(result);
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

//   루피 레벨 조회
const getLoopyLevel = (count) => {
  if (count <= 3) return { level: 1, label: '호기심 많은 탐색가' };
  if (count <= 9) return { level: 2, label: '차곡차곡 쌓는 수집가' };
  if (count <= 19) return { level: 3, label: '로컬 커피 탐험가' };
  return { level: 4, label: '커피왕 루피' };
};

export const getLoopyLevelInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 유저의 전체 스탬프북 개수 (상태 상관없이)
    const stampBookCount = await prisma.stampBook.count({
      where: {
        userId,
      },
    });

    const levelInfo = getLoopyLevel(stampBookCount);

    res.status(200).json({
      status: 'SUCCESS',
      code: 200,
      message: '루피 레벨 조회 성공',
      data: {
        stampBookCount,
        level: levelInfo.level,
        label: levelInfo.label,
      },
    });
  } catch (err) {
    next(err);
  }
};

// // [기능 11] 특정 카페에 대한 내 스탬프북 현황 조회
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



// // 도장 적립
// export const addStamp = async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const stampBookId = parseInt(req.params.stampBookId, 10);
//     const { cafeId, method } = req.body;

//     console.log("✅ [도장 적립] 요청 정보:", {
//       userId,
//       stampBookId,
//       cafeId,
//       method,
//     });

//     // 적립 방식 유효성 검사
//     if (!['QR', 'MANUAL'].includes(method)) {
//       console.warn("❌ [도장 적립] 잘못된 방식:", method);
//       return res.error(400, '적립 방식이 올바르지 않습니다.');
//     }

//     const stampBook = await prisma.stampBook.findUnique({
//       where: { id: stampBookId },
//       include: { stamps: true },
//     });

//     if (!stampBook) {
//       console.warn("❌ [도장 적립] 스탬프북 없음:", stampBookId);
//       return res.error(404, '스탬프북을 찾을 수 없습니다.');
//     }
//     if (stampBook.userId !== userId) {
//       console.warn("❌ [도장 적립] 사용자 불일치:", {
//         실제소유자: stampBook.userId,
//         요청자: userId,
//       });
//       return res.error(403, '해당 스탬프북에 접근 권한이 없습니다.');
//     }

//     const currentCount = stampBook.stamps.length;
//     const goalCount = stampBook.goalCount;

//     console.log("📊 [도장 적립] 현재 도장 수:", currentCount, "/", goalCount);

//     if (currentCount >= goalCount) {
//       return res.error(400, '이미 모든 도장이 적립되었습니다.');
//     }

    
//     await prisma.stamp.create({
//       data: {
//         stampBookId,
//         method,
//         stampedAt: new Date(),
//         source: 'USER',
//       },
//     });

//     const updatedCount = currentCount + 1;
//     const isCompleted = updatedCount >= goalCount;

//     console.log("✅ [도장 적립] 적립 완료 - 개수:", updatedCount);

//     try {
//       await prisma.notification.create({
//         data: {
//           userId: stampBook.userId,
//           cafeId: stampBook.cafeId,
//           type: 'stamp',
//           title: '스탬프가 적립되었어요!',
//           content: '지금 방금 적립한 스탬프에 대해 리뷰를 작성해보세요 ✍️',
//           isRead: false,
//         },
//       });
//     } catch (notificationError) {
//       console.error("❌ [도장 적립] 알림 생성 실패:", notificationError);
//     }

//     return res.success({
//       stampCount: updatedCount,
//       isStampbookCompleted: isCompleted,
//     });
    
//   } catch (error) {
//     console.error('[addStamp] 오류 발생:', error);
//     next(error);
//   }
// };