import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

import { StampbookNotFoundError } from "../errors/customErrors.js";
import { BadRequestError } from '../errors/customErrors.js';

// 1. 전체 스탬프북 조회
export const getMyStampBooks = async (req, res, next) => {
  const userId = req.user.id;
  const { sortBy } = req.query;

  try {
    let orderByClause;
    if (sortBy === 'mostStamped') {
      orderByClause = { currentCount: 'desc' };
    } else if (sortBy === 'shortestDeadline' || !sortBy) {
      orderByClause = { expiresAt: 'asc' };
    } else {
      return res.fail('잘못된 정렬 기준입니다.', 400);
    }

    const stampBooks = await prisma.stampBook.findMany({
      where: {
        userId,
        convertedAt: null,
        expiredAt: null,
        isCompleted: false,
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
      orderBy: orderByClause,
    });

    const now = new Date();
    const response = stampBooks.map((sb) => {
      
      let daysUntilExpiration = null;
      let isExpired = false;
      let isExpiringSoon = false;

      if (sb.expiresAt) {
        const today0 = new Date(now);           today0.setHours(0, 0, 0, 0);
        const expiry0 = new Date(sb.expiresAt); expiry0.setHours(0, 0, 0, 0);
        const diffMs = expiry0.getTime() - today0.getTime();
        daysUntilExpiration = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        isExpired = diffMs < 0;
        isExpiringSoon = diffMs > 0 && daysUntilExpiration <= 3;
      }

      const remainCount = Math.max(sb.goalCount - sb.currentCount, 0);
      const progressRatio = sb.goalCount > 0 ? sb.currentCount / sb.goalCount : 0;

      return {
        id: sb.id,
        cafe: {
          id: sb.cafe.id,
          name: sb.cafe.name,
          address: sb.cafe.address,
          image: sb.cafe.photos?.[0]?.photoUrl,
        },
        currentCount: sb.currentCount,
        goalCount: sb.goalCount,
        status: sb.status,
        expiresAt: sb.expiresAt,
        remainCount,
        progressRatio,
        isExpired,
        isExpiringSoon,
        daysUntilExpiration,
      };
    });

    return res.success(response);
  } catch (err) {
    logger.error(`스탬프북 리스트 조회 실패: ${err.message}`);
    next(err);
  }
};

// 스탬프북 상세 조회
export const getStampBookDetail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = parseInt(req.params.stampBookId, 10);

    if (isNaN(stampBookId)) {
      throw new BadRequestError('유효하지 않은 스탬프북 ID입니다.');
    }

    const stampBook = await prisma.stampBook.findFirst({
      where: {
        id: stampBookId,
        userId,
      },
      include: {
        cafe: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        stamps: {
          orderBy: { stampedAt: 'asc' },
          select: {
            id: true,
            stampedAt: true,
            stampImageUrl: true,
            source: true,
            note: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!stampBook) {
      throw new NotFoundError('존재하지 않는 스탬프북입니다.');
    }

    const sameCafeStampBooks = await prisma.stampBook.findMany({
      where: {
        userId,
        cafeId: stampBook.cafe.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
      },
    });

    const currentIndex = sameCafeStampBooks.findIndex(sb => sb.id === stampBookId);
    const nthStampBook = currentIndex >= 0 ? currentIndex + 1 : null;

    const now = new Date();
    const today0 = new Date(now); today0.setHours(0, 0, 0, 0);
    let daysUntilExpiration = null;
    let isExpired = false;
    let isExpiringSoon = false;

    if (stampBook.expiresAt) {
      const expiry0 = new Date(stampBook.expiresAt); expiry0.setHours(0, 0, 0, 0);
      const diffMs = expiry0.getTime() - today0.getTime();
      daysUntilExpiration = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      isExpired = diffMs < 0;
      isExpiringSoon = diffMs > 0 && daysUntilExpiration <= 3;
    }

    const responseData = {
      id: stampBook.id,
      cafe: stampBook.cafe,
      goalCount: stampBook.goalCount,
      currentCount: stampBook.stamps.length,
      status: stampBook.status,
      isCompleted: stampBook.isCompleted,
      rewardDetail: stampBook.rewardDetail,
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
      nthStampBook, 
      isExpiringSoon,
      isExpired,
      daysUntilExpiration,
    };

    res.status(200).json({
      status: 'SUCCESS',
      code: 200,
      message: '스탬프북 상세 조회 성공',
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

// 도장 적립

export const addStamp = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = parseInt(req.params.stampBookId, 10);
    const { cafeId, method } = req.body;

    console.log("✅ [도장 적립] 요청 정보:", {
      userId,
      stampBookId,
      cafeId,
      method,
    });

    // 적립 방식 유효성 검사
    if (!['QR', 'MANUAL'].includes(method)) {
      console.warn("❌ [도장 적립] 잘못된 방식:", method);
      return res.error(400, '적립 방식이 올바르지 않습니다.');
    }

    const stampBook = await prisma.stampBook.findUnique({
      where: { id: stampBookId },
      include: { stamps: true },
    });

    if (!stampBook) {
      console.warn("❌ [도장 적립] 스탬프북 없음:", stampBookId);
      return res.error(404, '스탬프북을 찾을 수 없습니다.');
    }
    if (stampBook.userId !== userId) {
      console.warn("❌ [도장 적립] 사용자 불일치:", {
        실제소유자: stampBook.userId,
        요청자: userId,
      });
      return res.error(403, '해당 스탬프북에 접근 권한이 없습니다.');
    }

    const currentCount = stampBook.stamps.length;
    const goalCount = stampBook.goalCount;

    console.log("📊 [도장 적립] 현재 도장 수:", currentCount, "/", goalCount);

    if (currentCount >= goalCount) {
      return res.error(400, '이미 모든 도장이 적립되었습니다.');
    }

    
    await prisma.stamp.create({
      data: {
        stampBookId,
        method,
        stampedAt: new Date(),
        source: 'USER',
      },
    });

    const updatedCount = currentCount + 1;
    const isCompleted = updatedCount >= goalCount;

    console.log("✅ [도장 적립] 적립 완료 - 개수:", updatedCount);

    try {
      await prisma.notification.create({
        data: {
          userId: stampBook.userId,
          cafeId: stampBook.cafeId,
          type: 'stamp',
          title: '스탬프가 적립되었어요!',
          content: '지금 방금 적립한 스탬프에 대해 리뷰를 작성해보세요 ✍️',
          isRead: false,
        },
      });
    } catch (notificationError) {
      console.error("❌ [도장 적립] 알림 생성 실패:", notificationError);
    }

    return res.success({
      stampCount: updatedCount,
      isStampbookCompleted: isCompleted,
    });
    
  } catch (error) {
    console.error('[addStamp] 오류 발생:', error);
    next(error);
  }
};


//  [기능 4] 스탬프 → 포인트 환전
// - 사용 화면: [스탬프북 상세 > ‘환전하기’ 버튼 클릭 시]
// - 완료된 스탬프북만 환전 가능, 1스탬프당 100포인트 환산
// - 포인트 적립 후, 트랜잭션으로 유저 포인트 + 스탬프북 상태 변경 + 기록 저장

export const convertStampToPoint = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = parseInt(req.params.stampBookId, 10);

    if (isNaN(stampBookId)) {
      throw new BadRequestError("유효하지 않은 스탬프북 ID입니다.");
    }

    const stampBook = await prisma.stampBook.findUnique({
      where: { id: stampBookId },
      include: { stamps: true },
    });

    // 유효성 검사
    if (!stampBook)
      throw new StampbookNotFoundError("존재하지 않는 스탬프북입니다.");
    if (stampBook.userId !== userId)
      throw new ForbiddenError("본인의 스탬프북만 환전할 수 있습니다.");
    if (stampBook.status !== "completed")
      throw new BadRequestError("완료된 스탬프북만 환전할 수 있습니다.");
    if (stampBook.isConverted || stampBook.convertedAt)
      throw new BadRequestError("이미 환전된 스탬프북입니다.");

    const stampCount = stampBook.stamps.length;
    if (stampCount === 0)
      throw new BadRequestError("환전 가능한 스탬프가 없습니다.");

    const pointAmount = stampCount * 2; // 스탬프 1개당 2포인트

    // 트랜잭션 처리
    await prisma.$transaction([
      prisma.stampBook.update({
        where: { id: stampBookId },
        data: {
          convertedAt: new Date(),
          isConverted: true,
          status: "converted",
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          totalPoint: {
            increment: pointAmount,
          },
        },
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
    ]);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: `${stampCount}개의 스탬프가 ${pointAmount}포인트로 환전되었습니다.`,
      data: {
        stampCount,
        pointAmount,
        convertedAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};

//  [기능 6] 스탬프북 기간 연장
// - 사용 화면: [스탬프북 상세 화면 > 연장 버튼 클릭 시]
// - 진행 중인(active) 스탬프북만 1회 14일 연장 가능
// - 이미 연장된 경우 재연장 불가

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

    // ⚙️ 만료일 기준 14일 연장
    const newExpiresAt = new Date(stampBook.expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + 14);

    const updated = await prisma.stampBook.update({
      where: { id: stampBookId },
      data: {
        expiresAt: newExpiresAt,
        extendedAt: new Date(),
      },
    });

    // ✅ 남은 일 수 및 소멸 임박 여부 계산
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

// [기능 7] 소멸 임박 스탬프북 조회
// - 사용 화면: [마이페이지 or 홈 > “곧 만료돼요” 배너 영역]
// - 만료까지 7일 이하 남은 active 상태의 스탬프북 조회
// - 만료일 오름차순 정렬

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
// - 사용 화면: [마이페이지 > 스탬프 히스토리]
// - status가 'converted'인 스탬프북만 조회
// - 최근 환전된 순으로 정렬
// - 몇 번째 스탬프북인지(round), 언제 환전 완료됐는지(convertedAt) 표시

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

//   [기능 9] 총 스탬프 수 조회
// - 사용 화면: [마이페이지 상단 ‘총 스탬프 ○○개’ 영역]
// - 로그인한 유저가 보유한 전체 스탬프 개수 반환
// - 모든 스탬프북의 도장 수 합산

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

//   [기능 10] 루피 레벨 조회
// - 사용 화면: [마이페이지 / 레벨 안내]
// - 유저가 보유한 스탬프북 개수에 따라 루피 레벨 계산

// 레벨 기준 계산 함수
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
// // 사용 화면: [카페 상세 페이지 > 내 스탬프 현황]
// // 조건: 로그인한 유저가 해당 카페에 대해 보유한 스탬프북이 있어야 함

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