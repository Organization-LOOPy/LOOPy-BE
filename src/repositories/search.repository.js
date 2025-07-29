import { logger } from "../utils/logger.js";
import prisma from "../../prisma/client.js";

export const cafeSearchRepository = {
  async findCafeByInfos(whereConditions, cursor, take = 10) {
    const whereClause = { ...whereConditions };

    if (cursor) {
      whereClause.createdAt = { lt: cursor };
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
        region1: true,
        region2: true,
        region3: true,
        cafePhotos: {
          orderBy: { displayOrder: "asc" },
          take: 1,
          select: {
            id: true,
            photoUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: take + 1, // 다음 페이지 존재 확인
    });

    return cafeList;
  },

  async findCafeWithBookmarks(whereConditions, userId) {
    const cafes = await prisma.cafe.findMany({
      where: whereConditions,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        userBookmarks: {
          where: { userId: userId },
          select: { id: true },
        },
      },
      take: 30,
    });

    return cafes;
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
        bookmarkedBy: {
          where: {
            userId: userId,
          },
          select: { id: true },
        },
      },
    });

    // 북마크 정보를 isBookmarked로 변환
    return cafes.map((cafe) => ({
      ...cafe,
      isBookmarked: cafe.bookmarkedBy.length > 0,
      bookmarkedBy: undefined, // 응답에서 제거
    }));
  },
};
