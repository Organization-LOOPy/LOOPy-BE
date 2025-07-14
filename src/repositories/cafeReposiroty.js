import { logger } from "../utils/logger.js";
import prisma from "../../prisma/client.js";

export const cafeRepository = {
  async findPhotos(cafeId) {
    const photos = await prisma.photo.findMany({
      where: { cafeId },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        url: true,
        displayOrder: true,
      },
    });

    logger.debug(`카페 ID: ${cafeId}의 사진 조회 성공: ${photos.length}개`);
    return photos;
  },

  async findMenu(cafeId) {
    const menu = await prisma.menu.findMany({
      where: { cafeId },
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        photoUrl: true,
      },
    });

    logger.debug(`카페 ID: ${cafeId}의 메뉴 조회 성공: ${menu.length}개`);
    return menu;
  },
};
