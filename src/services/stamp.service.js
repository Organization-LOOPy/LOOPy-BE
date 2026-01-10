import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

import {
  BadRequestError,
  ForbiddenError,
  StampbookNotFoundError,
  StampNotEligibleError,
} from "../errors/customErrors.js";

import { toStartOfDayKST } from "../utils/date.utils.js";

// 정렬 기준 상수 정의
const SORT_OPTIONS = {
    MOST_STAMPED: "mostStamped",
    SHORTEST_DEADLINE: "shortestDeadline",
};


// 1. 전체 스탬프북 조회 서비스
export const stampService = {
    async getMyStampBooks(userId, sortBy) {
      // 정렬 기준 검증
      let orderByClause;
      switch (sortBy) {
        case SORT_OPTIONS.MOST_STAMPED:
          orderByClause = [
            { currentCount: "desc" },
            { expiresAt: "asc" },
            { id: "asc" },
          ];
          break;
  
        case SORT_OPTIONS.SHORTEST_DEADLINE:
        case undefined:
        case null:
          orderByClause = [{ expiresAt: "asc" }, { id: "asc" }];
          break;
  
        default:
          throw new BadRequestError(`지원하지 않는 정렬 기준입니다: ${sortBy}`);
      }
  
      // 진행 중 스탬프북 조회
      const now = new Date();
      const stampBooks = await prisma.stampBook.findMany({
        where: {
          userId,
          isConverted: false,
          isCompleted: false,
          expiresAt: { gt: now },
        },
        include: {
          cafe: {
            select: {
              id: true,
              name: true,
              address: true,
              photos: {
                orderBy: { displayOrder: "asc" },
                take: 1,
                select: { photoUrl: true },
              },
            },
          },
        },
        orderBy: orderByClause,
      });
  
      // 날짜 계산 기준
      const todayKST = toStartOfDayKST(new Date());
  
      // 변환 함수
      const mapStampBook = (book) => {
        const expiresAt = book.expiresAt ? toStartOfDayKST(book.expiresAt) : null;
        const diffMs = expiresAt ? expiresAt - todayKST : null;
        const daysUntilExpiration =
          diffMs !== null ? Math.floor(diffMs / 86400000) : null;
  
        const isExpired = diffMs !== null && diffMs < 0;
        const isExpiringSoon =
          diffMs !== null && diffMs >= 0 && daysUntilExpiration <= 3;
  
        const remainCount = Math.max(book.goalCount - book.currentCount, 0);
        const progressPercent = Math.min(
          100,
          Math.round((book.currentCount / book.goalCount) * 100)
        );
  
        return {
          id: book.id,
          cafe: {
            id: book.cafe.id,
            name: book.cafe.name,
            address: book.cafe.address,
            image: book.cafe.photos?.[0]?.photoUrl ?? null,
          },
          currentCount: book.currentCount,
          goalCount: book.goalCount,
          status: book.status,
          expiresAt: book.expiresAt,
          remainCount,
          progressPercent,
          isExpired,
          isExpiringSoon,
          daysUntilExpiration,
        };
      };
  
      // 응답 반환
      const items = stampBooks.map(mapStampBook);
  
      return {
        totalCount: items.length,
        sortBy: sortBy ?? SORT_OPTIONS.SHORTEST_DEADLINE,
        items,
      };
    },
};

// 스탬프북 상세 조회
export const getStampBookDetailService = async (userId, stampBookId) => {
    if (isNaN(stampBookId)) {
      throw new BadRequestError("유효하지 않은 스탬프북 ID입니다.");
    }
  
    const stampBook = await prisma.stampBook.findFirst({
      where: { id: stampBookId, userId },
      include: {
        cafe: {
          select: {
            id: true,
            name: true,
            address: true,
            photos: {
              orderBy: { displayOrder: "asc" },
              take: 1,
              select: { photoUrl: true },
            },
          },
        },
        stamps: {
          orderBy: { stampedAt: "asc" },
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
      throw new StampbookNotFoundError("존재하지 않는 스탬프북입니다.");
    }
  
    // 만료 관련 계산
    const today = toStartOfDayKST(new Date());
    const expiryDate = stampBook.expiresAt ? toStartOfDayKST(stampBook.expiresAt) : null;
  
    let daysUntilExpiration = null;
    let isExpired = false;
    let isExpiringSoon = false;
  
    if (expiryDate) {
      const diffDays = Math.floor((expiryDate - today) / 86400000);
      daysUntilExpiration = diffDays;
      isExpired = diffDays < 0;
      isExpiringSoon = diffDays >= 0 && diffDays <= 3;
    }
  
    const { cafe, stamps } = stampBook;
  
    return {
      id: stampBook.id,
      cafe: {
        id: cafe.id,
        name: cafe.name,
        address: cafe.address,
        image: cafe.photos?.[0]?.photoUrl ?? null,
      },
      round: stampBook.round,
      goalCount: stampBook.goalCount,
      currentCount: stampBook.currentCount,
      stampsCount: stamps.length,
      progressPercent: Math.min(
        100,
        Math.round((stampBook.currentCount / stampBook.goalCount) * 100)
      ),
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
      stamps,
      isExpiringSoon,
      isExpired,
      daysUntilExpiration,
    };
};
  
// 3. 스탬프북 환전
export const convertStampToPointService = async (userId, stampBookId) => {
  if (isNaN(stampBookId)) {
    throw new BadRequestError("유효하지 않은 스탬프북 ID입니다.");
  }

  const stampBook = await prisma.stampBook.findUnique({
    where: { id: stampBookId },
    include: {
      stamps: true,
      cafe: { select: { id: true, name: true } },
    },
  });

  // 유효성 검증
  if (!stampBook)
    throw new StampbookNotFoundError("존재하지 않는 스탬프북입니다.");
  if (stampBook.userId !== userId)
    throw new ForbiddenError("본인의 스탬프북만 환전할 수 있습니다.");
  if (stampBook.isConverted || stampBook.status === "converted")
    throw new BadRequestError("이미 환전(종료)된 스탬프북입니다.");

  // ✅ 소멸 임박 조건 제거 → 단순히 active 상태면 환전 가능
  if (stampBook.status !== "active")
    throw new BadRequestError("활성 상태의 스탬프북만 환전할 수 있습니다.");

  const stampCount = stampBook.stamps.length;
  if (stampCount === 0)
    throw new BadRequestError("환전 가능한 스탬프가 없습니다.");

  // 환전 처리
  const POINT_PER_STAMP = 2;
  const pointAmount = stampCount * POINT_PER_STAMP;
  const now = new Date();

  await prisma.$transaction([
    // 포인트 적립 내역 생성
    prisma.pointTransaction.create({
      data: {
        userId,
        stampBookId,
        point: pointAmount,
        type: "earned",
        description: "스탬프 환전",
      },
    }),
    // 스탬프북 상태 업데이트
    prisma.stampBook.update({
      where: { id: stampBookId },
      data: {
        convertedAt: now,
        isConverted: true,
        status: "converted",
        currentCount: 0,
      },
    }),
    // 기존 스탬프 삭제
    prisma.stamp.deleteMany({ where: { stampBookId } }),
  ]);

  // 결과 반환
  return {
    stampBookId,
    cafeId: stampBook.cafe.id,
    cafeName: stampBook.cafe.name,
    stampCount,
    pointPerStamp: POINT_PER_STAMP,
    pointAmount,
    remainingStampCount: 0,
    convertedAt: now.toISOString(),
  };
};

  
// 4. 스탬프북 연장 처리
export const extendStampBookService = async (userId, stampBookId) => {
    if (isNaN(stampBookId)) {
      throw new BadRequestError("유효하지 않은 스탬프북 ID입니다.");
    }
  
    const stampBook = await prisma.stampBook.findUnique({
      where: { id: stampBookId },
    });
  
    // 유효성 검증
    if (!stampBook)
      throw new StampbookNotFoundError("존재하지 않는 스탬프북입니다.");
    if (stampBook.userId !== userId)
      throw new ForbiddenError("해당 스탬프북에 대한 권한이 없습니다.");
    if (stampBook.status !== "active")
      throw new BadRequestError("진행 중인 스탬프북만 연장할 수 있습니다.");
    if (stampBook.extendedAt)
      throw new BadRequestError("이미 연장된 스탬프북입니다.");
  
    // 연장 처리
    const EXTENSION_DAYS = 14;
    const newExpiresAt = new Date(stampBook.expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + EXTENSION_DAYS);
  
    const updated = await prisma.stampBook.update({
      where: { id: stampBookId },
      data: {
        expiresAt: newExpiresAt,
        extendedAt: new Date(),
      },
    });
  
    // 결과 반환
    return {
      stampBookId: updated.id,
      expiresAt: newExpiresAt,
      extendedAt: updated.extendedAt,
    };
};
  
// 5. 소멸 임박 스탬프북 조회
export const getExpiringStampBooksService = async (userId) => {
    const today = toStartOfDayKST(new Date());
    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
  
    const expiringBooks = await prisma.stampBook.findMany({
      where: {
        userId,
        status: "active",
        expiresAt: { gte: today, lte: oneWeekLater },
      },
      include: {
        cafe: {
          select: {
            id: true,
            name: true,
            address: true,
            photos: {
              orderBy: { displayOrder: "asc" },
              take: 1,
              select: { photoUrl: true },
            },
          },
        },
      },
      orderBy: { expiresAt: "asc" },
    });
  
    return expiringBooks.map((book) => {
      const goalCount = book.goalCount ?? 0;
      const currentCount = book.currentCount ?? 0;
  
      const progressPercent =
        goalCount > 0
          ? Math.min(100, Math.round((currentCount / goalCount) * 100))
          : 0;
  
      const expiresAtStart = book.expiresAt ? toStartOfDayKST(book.expiresAt) : null;
      const diffDays =
        expiresAtStart !== null
          ? Math.floor((expiresAtStart - today) / 86400000)
          : null;
  
      const daysUntilExpiration = diffDays;
      const isExpiringSoon = diffDays !== null && diffDays >= 0 && diffDays <= 3;
      const remain = Math.max(0, goalCount - currentCount);
  
      const canExtend =
        !book.isCompleted &&
        diffDays !== null &&
        diffDays > 0 &&
        diffDays <= 7;
  
      return {
        id: book.id,
        cafe: {
          id: book.cafe.id,
          name: book.cafe.name,
          address: book.cafe.address,
          image: book.cafe.photos?.[0]?.photoUrl ?? null,
        },
        round: book.round,
        rewardDetail: book.rewardDetail ?? null,
        goalCount,
        currentCount,
        progressPercent,
        status: book.status,
        isCompleted: !!book.isCompleted,
        expiresAt: book.expiresAt,
        daysUntilExpiration,
        isExpiringSoon,
        previewRewardText: `${remain}회 후 포인트로 자동 환전돼요!`,
        canExtend,
      };
    });
};

// 6. 스탬프 히스토리 조회
export const getConvertedStampbooksService = async (userId) => {
    const stampBooks = await prisma.stampBook.findMany({
      where: {
        userId,
        OR: [{ status: "converted" }, { status: "completed" }],
      },
      orderBy: [
        { convertedAt: "desc" },
        { completedAt: "desc" },
        { id: "desc" },
      ],
      include: {
        cafe: {
          select: {
            id: true,
            name: true,
            address: true,
            photos: {
              orderBy: { displayOrder: "asc" },
              take: 1,
              select: { photoUrl: true },
            },
          },
        },
      },
    });
  
    // 카페별 그룹화
    const groupedByCafe = new Map();
  
    for (const book of stampBooks) {
      const cafeId = book.cafe.id;
  
      if (!groupedByCafe.has(cafeId)) {
        groupedByCafe.set(cafeId, {
          cafeId,
          cafeName: book.cafe.name,
          cafeAddress: book.cafe.address,
          cafeImageUrl: book.cafe.photos?.[0]?.photoUrl ?? null,
          totalCount: 0,
          convertedCount: 0,
          completedCount: 0,
          items: [],
        });
      }
  
      const group = groupedByCafe.get(cafeId);
      group.totalCount += 1;
      if (book.status === "converted") group.convertedCount += 1;
      if (book.status === "completed") group.completedCount += 1;
  
      group.items.push({
        stampBookId: book.id,
        round: book.round,
        status: book.status,
        isConverted: book.status === "converted",
        completedAt: book.completedAt,
        convertedAt: book.convertedAt,
        displayText:
          book.status === "converted"
            ? `스탬프지 ${book.round}장 환전 완료`
            : `스탬프지 ${book.round}장 완료`,
      });
    }
  
    // 최신순 정렬
    return Array.from(groupedByCafe.values()).map((group) => {
      group.items.sort((a, b) => {
        const timeA = new Date(a.convertedAt ?? a.completedAt ?? 0).getTime();
        const timeB = new Date(b.convertedAt ?? b.completedAt ?? 0).getTime();
        return timeB - timeA || b.stampBookId - a.stampBookId;
      });
      return group;
    });
};
  
// 7. 총 스탬프 수 조회 서비스
export const getTotalStampCountService = async (userId) => {
    if (!userId) {
      throw new BadRequestError("유효하지 않은 사용자 ID입니다.");
    }
  
    const total = await prisma.stamp.count({
      where: {
        stampBook: { userId },
      },
    });
  
    return { total };
  };

// 8. 레벨 조회
const getLoopyLevel = (count) => {
    if (count <= 3)
      return { level: 1, label: "호기심 많은 탐색가", nextTarget: 4 };
    if (count <= 9)
      return { level: 2, label: "차곡차곡 쌓는 수집가", nextTarget: 10 };
    if (count <= 19)
      return { level: 3, label: "동네 카페 전문가", nextTarget: 20 };
    return { level: 4, label: "카페왕 루피", nextTarget: null };
};
  

export const getLoopyLevelInfoService = async (userId) => {
    if (!userId) {
      throw new BadRequestError("유효하지 않은 사용자 ID입니다.");
    }
  
    const stampBookCount = await prisma.stampBook.count({
      where: { userId },
    });
  
    const { level, label, nextTarget } = getLoopyLevel(stampBookCount);
  
    const remainingToNext =
      nextTarget === null ? null : Math.max(0, nextTarget - stampBookCount);
  
    return {
      stampBookCount,
      level,
      label,
      nextTarget,
      remainingToNext,
    };
};

// 9. 특정 카페별 내 스탬프북 현황 조회 서비스

export const getMyStampByCafeService = async (userId, cafeId) => {
    if (!userId || !cafeId) {
      throw new BadRequestError("유효하지 않은 요청입니다.");
    }
  
    const stampBook = await prisma.stampBook.findFirst({
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
  
    if (!stampBook) return null;
  
    return {
      stampBookId: stampBook.id,
      currentCount: stampBook.currentCount,
      goalCount: stampBook.goalCount,
      expiresAt: stampBook.expiresAt,
    };
};
  
// 스탬프북 완료 시 리워드 쿠폰 발급 서비스
export const handleStampCompletionService = async (userId, cafeId) => {
    if (!userId || !cafeId) {
      throw new BadRequestError("유효하지 않은 요청입니다.");
    }
  
    // 1️) 현재 진행 중 스탬프북 확인
    const stampBook = await prisma.stampBook.findFirst({
      where: { userId, cafeId, isCompleted: false },
    });
  
    if (
      !stampBook ||
      stampBook.isCompleted ||
      typeof stampBook.currentCount !== "number" ||
      stampBook.currentCount < 10
    ) {
      throw new StampNotEligibleError(
        userId,
        cafeId,
        10,
        stampBook?.currentCount ?? null
      );
    }
  
    // 2️) 카페별 리워드 정책 조회
    const stampPolicy = await prisma.stampPolicy.findUnique({ where: { cafeId } });
    if (!stampPolicy) {
      throw new NotFoundError("해당 카페의 스탬프 정책이 존재하지 않습니다.");
    }
  
    // 3️) 리워드 쿠폰 발급 관련 데이터 준비
    const now = new Date();
    const expiredAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  
    const rewardTypeMap = {
      DISCOUNT: "DISCOUNT",
      FREE_DRINK: "FREE_DRINK",
      SIZE_UP: "SIZE_UP",
    };
  
    // 4️) 트랜잭션 실행 (쿠폰 발급 + 스탬프북 갱신 + 신규 생성)
    const [couponTemplate, userCoupon] = await prisma.$transaction([
      // (1) 쿠폰 템플릿 생성
      prisma.couponTemplate.create({
        data: {
          cafeId,
          name: stampPolicy.rewardDescription || "스탬프 리워드 쿠폰",
          discountType: rewardTypeMap[stampPolicy.rewardType],
          discountValue: stampPolicy.discountAmount ?? 0,
          applicableMenuId: stampPolicy.menuId ?? null,
          isActive: true,
          validDays: stampPolicy.hasExpiry ? null : 14,
          expiredAt:
            stampPolicy.hasExpiry && stampPolicy.rewardExpiresAt
              ? stampPolicy.rewardExpiresAt
              : expiredAt,
        },
      }),
  
      // (2) 사용자 쿠폰 발급
      prisma.userCoupon.create({
        data: {
          userId,
          acquisitionType: "stamp",
          status: "active",
          issuedAt: now,
          expiredAt,
          couponTemplateId: undefined,
        },
      }),
    ]);
  
    // 쿠폰 생성 결과를 트랜잭션 이후 수동 연결
    await prisma.userCoupon.update({
      where: { id: userCoupon.id },
      data: { couponTemplateId: couponTemplate.id },
    });
  
    // 5️) 기존 스탬프북 완료 처리 + 신규 스탬프북 생성
    await prisma.$transaction([
      prisma.stampBook.update({
        where: { id: stampBook.id },
        data: {
          isCompleted: true,
          completedAt: now,
          status: "completed",
        },
      }),
      prisma.stampBook.create({
        data: {
          userId,
          cafeId,
          currentCount: 0,
          goalCount: 10,
          status: "active",
          startedAt: now,
          rewardDetail: "스탬프 리워드 쿠폰",
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);
  
    // 6️) 결과 반환 (기존 구조 유지)
    return {
      ...userCoupon,
      couponTemplate,
    };
  };
  