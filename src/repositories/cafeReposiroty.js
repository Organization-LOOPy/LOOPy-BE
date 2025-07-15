import { logger } from "../utils/logger.js";
import prisma from "../../prisma/client.js";
import {
  CafePhotosNotFoundError,
  MenuNotFoundError,
} from "../errors/customErrors.js";

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
    if (!photos || photos.length === 0) {
      logger.error(`카페 ID: ${cafeId}에 대한 사진이 없습니다.`);
      throw new CafePhotosNotFoundError(cafeId);
    }

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
    if (!menu || menu.length === 0) {
      logger.error(`카페 ID: ${cafeId}에 대한 메뉴가 없습니다.`);
      throw new MenuNotFoundError(cafeId);
    }

    logger.debug(`카페 ID: ${cafeId}의 메뉴 조회 성공: ${menu.length}개`);
    return menu;
  },
};

export const stampBookRepository = {
  async findStampBook(userId, cafeId) {
    const stampBook = await prisma.stampBook.findUnique({
      where: { userId: userId, cafeId: cafeId },
      select: {
        stamps: true,
        currentCount: true,
        goalCount: true,
        expiredAt: true,
      },
    });

    if (!stampBook) {
      logger.debug(
        `유저 ID: ${userId}의 카페 ID: ${cafeId}에 대한 스탬프북이 없습니다.`
      );
      return null;
    }

    logger.debug(`유저 ID: ${userId}의 카페 ID: ${cafeId} 스탬프북 조회 성공`);
    return stampBook;
  },
};
