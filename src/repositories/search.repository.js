import { logger } from "../utils/logger.js";
import prisma from "../../prisma/client.js";

export const cafeSearchRepository = {
  async findCafeByInfos(whereConditions, cursor, userId, take = 15) {
    const whereClause = { ...whereConditions };

    // cursor가 문자열이고 유효할 때만 추가
    if (cursor && typeof cursor === "string" && cursor.trim() !== "") {
      whereClause.id = { gt: parseInt(cursor) };
    }

    const cafeList = await prisma.cafe.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        address: true,
        keywords: true,
        latitude: true,
        longitude: true,
        region1DepthName: true,
        region2DepthName: true,
        region3DepthName: true,
        storeFilters: true,
        takeOutFilters: true,
        menuFilters: true,
        createdAt: true,
        photos: {
          orderBy: { displayOrder: "asc" },
          take: 1,
          select: {
            id: true,
            photoUrl: true,
          },
        },
        bookmarkedBy: userId
          ? {
              where: { userId: userId },
              select: { id: true },
            }
          : false,

        stampBooks: {
          where: {
            userId: userId,
            expiresAt: { gte: new Date() },
          },
          select: { id: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: take + 1,
    });

    // nextCursor 계산
    const hasMore = cafeList.length > take;
    const cafes = hasMore ? cafeList.slice(0, -1) : cafeList;
    const nextCursor =
      hasMore && cafes.length > 0
        ? cafes[cafes.length - 1].id.toString()
        : null;

    return {
      cafes,
      nextCursor,
      hasMore,
    };
  },

  async findCafeByIds(cafeIds, userId) {
    return await prisma.cafe.findMany({
      where: {
        id: { in: cafeIds },
      },
      select: {
        id: true,
        name: true,
        address: true,
        keywords: true,
        latitude: true,
        longitude: true,
        region1DepthName: true,
        region2DepthName: true,
        region3DepthName: true,
        createdAt: true,
        photos: {
          orderBy: { displayOrder: "asc" },
          take: 1,
          select: {
            id: true,
            photoUrl: true,
          },
        },
        bookmarkedBy: userId
          ? {
              where: { userId: userId },
              select: { id: true },
            }
          : false,
      },
    });
  },
};

export const cafeMapRepository = {
  async findCafesInArea({
    centerX,
    centerY,
    latRange,
    lonRange,
    region1,
    region2,
    region3,
    storeFilters,
    menuFilters,
    takeOutFilters,
    userId,
  }) {
    const whereConditions = {
      AND: [
        { status: "active" },
        // 대략적인 범위로 먼저 필터링 (DB 쿼리 최적화)
        {
          latitude: {
            gte: centerY - latRange,
            lte: centerY + latRange,
          },
        },
        {
          longitude: {
            gte: centerX - lonRange,
            lte: centerX + lonRange,
          },
        },
        ...(region1 ? [{ region1DepthName: region1 }] : []),
        ...(region2 ? [{ region2DepthName: region2 }] : []),
      ],
    };

    // 스토어 필터 조건 추가
    Object.keys(storeFilters).forEach((filter) => {
      whereConditions.AND.push({
        storeFilters: {
          path: `$."${filter}"`, // 키를 따옴표로 감싸기
          equals: true,
        },
      });
    });

    // 메뉴 필터 조건 추가
    Object.keys(menuFilters).forEach((filter) => {
      whereConditions.AND.push({
        menuFilters: {
          path: `$."${filter}"`, // 키를 따옴표로 감싸기
          equals: true,
        },
      });
    });

    // 테이크아웃 필터 조건 추가
    Object.keys(takeOutFilters).forEach((filter) => {
      whereConditions.AND.push({
        takeOutFilters: {
          path: `$."${filter}"`, // 키를 따옴표로 감싸기
          equals: true,
        },
      });
    });

    // DB에서 카페 데이터 조회 (북마크 정보 포함)
    const cafes = await prisma.cafe.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        stampBooks: {
          where: {
            userId: userId,
            expiresAt: { gte: new Date() },
          },
          select: { id: true },
        },
      },
    });

    return cafes.map((cafe) => {
      const isStamped =
        Array.isArray(cafe.stampBooks) && cafe.stampBooks.length > 0;

      return {
        ...cafe,
        isStamped,
        stampBooks: undefined, // 응답에서 제거
      };
    });
  },
};
