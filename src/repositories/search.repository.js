import { logger } from "../utils/logger.js";
import prisma from "../../prisma/client.js";

export const cafeSearchRepository = {
  async findCafeByInfos(whereConditions, cursor, userId, take = 15) {
    // 1. 기본 where 절 구성 (상태가 active인 것만 조회)
    // 외부에서 들어오는 whereConditions가 스키마의 필드명(camelCase)을 따르는지 확인이 필요합니다.
    const whereClause = {
      status: "active",
      ...(whereConditions || {}),
    };

    // 2. 커서 기반 페이지네이션 처리
    if (cursor && typeof cursor === "string" && cursor.trim() !== "") {
      const cursorId = parseInt(cursor);
      if (!isNaN(cursorId)) {
        whereClause.id = { gt: cursorId };
      }
    }

    try {
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
          createdAt: true, // ✅ 스키마 필드명 일치 확인
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
          createdAt: "desc", // ✅ 에러 원인 수정: created_at -> createdAt
        },
        take: take + 1,
      });

      // 차후 페이지 유무 계산
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
    } catch (error) {
      logger.error(`findCafeByInfos Repository Error: ${error.message}`);
      throw error; // 서비스 단으로 에러를 던져 500 응답 처리
    }
  },

  async findCafeByIds(cafeIds, userId) {
    return await prisma.cafe.findMany({
      where: {
        id: { in: cafeIds },
        status: "active",
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
        storeFilters: true,
        takeOutFilters: true,
        menuFilters: true,
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
    // 1. 기본 필터 조건 (위치 및 상태)
    const whereConditions = {
      status: "active",
      AND: [
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
      ],
    };

    // 2. 지역명 조건 추가 (존재할 때만)
    if (region1) whereConditions.AND.push({ region1DepthName: region1 });
    if (region2) whereConditions.AND.push({ region2DepthName: region2 });
    if (region3) whereConditions.AND.push({ region3DepthName: region3 });

    // 3. JSON 필터 조건 추가 (MySQL JSON_CONTAINS 방식에 대응하는 Prisma 문법)
    const addJsonFilters = (filterObj, fieldName) => {
      if (filterObj && Object.keys(filterObj).length > 0) {
        Object.keys(filterObj).forEach((key) => {
          if (filterObj[key] === true) {
            whereConditions.AND.push({
              [fieldName]: {
                path: `$.${key}`,
                equals: true,
              },
            });
          }
        });
      }
    };

    addJsonFilters(storeFilters, "storeFilters");
    addJsonFilters(menuFilters, "menuFilters");
    addJsonFilters(takeOutFilters, "takeOutFilters");

    try {
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
          bookmarkedBy: userId
            ? {
                where: { userId: userId },
                select: { id: true },
              }
            : false,
        },
      });

      return cafes.map((cafe) => ({
        ...cafe,
        isStamped: Array.isArray(cafe.stampBooks) && cafe.stampBooks.length > 0,
        stampBooks: undefined,
      }));
    } catch (error) {
      logger.error(`findCafesInArea Repository Error: ${error.message}`);
      throw error;
    }
  },
};