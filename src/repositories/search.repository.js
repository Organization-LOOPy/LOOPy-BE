import { logger } from "../utils/logger.js";
import prisma from "../../prisma/client.js";

export const cafeSearchRepository = {
  async findCafesByIds(cafeIds) {
    const cafeInfo = await prisma.cafe.findMany({
      where: {
        id: { in: cafeIds }, // 배열 검색
      },
      select: {
        id: true,
        name: true,
        address: true,
        keywords: true,
        latitude: true,
        longitude: true,
        cafePhotos: {
          where: { cafeId: { in: cafeIds } },
          orderBy: { displayOrder: "asc" },
          take: 1,
          select: {
            id: true,
            photoUrl: true,
          },
        },
      },
    });

    return cafeInfo;
  },

  async findCafeByInfos(whereConditions) {
    const cafeList = await prisma.cafe.findMany({
      where: whereConditions,
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
      //orderBy: [
      // 필요시 region3 일치도로 정렬
      //],
    });

    return cafeList;
  },
};
