import prisma from '../../prisma/client.js';
import {
  InternalServerError,
  BookmarkAlreadyExistsError,
  BookmarkNotFoundError,
  CafeNotFoundError,
  BadRequestError,
} from '../errors/customErrors.js';

// 북마크한 카페 조회 
export const getBookmarkedCafesService = async (userId) => {
  try {
    const bookmarks = await prisma.userBookmark.findMany({
      where: { userId: Number(userId) },
      include: { 
        cafe: {
          include: {
            photos: { take: 1, orderBy: { createdAt: 'asc' },},
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookmarks.map((bookmark) => ({
      id: bookmark.cafe.id.toString(),
      name: bookmark.cafe.name,
      address: bookmark.cafe.address,
      region: bookmark.cafe.region,
      latitude: bookmark.cafe.latitude,
      longitude: bookmark.cafe.longitude,
      description: bookmark.cafe.description,
      keywords: bookmark.cafe.keywords,
      status: bookmark.cafe.status,
      createdAt: bookmark.cafe.createdAt,
      updatedAt: bookmark.cafe.updatedAt,
      photoUrl: bookmark.cafe.photos[0]?.photoUrl || null, 
    }));
  } catch (err) {
    throw new InternalServerError('북마크한 카페 조회 실패', err);
  }
};

// 북마크한 카페 추가 
export const addBookmarkService = async (userId, cafeId) => {
  if (!cafeId) throw new BadRequestError('카페 ID가 필요합니다.');

  try {
    const cafe = await prisma.cafe.findUnique({ where: { id: Number(cafeId) } });
    if (!cafe) throw new CafeNotFoundError({ cafeId });

    const existing = await prisma.userBookmark.findUnique({
      where: {
        userId_cafeId: {
          userId: Number(userId),
          cafeId: Number(cafeId),
        },
      },
    });

    if (existing) throw new BookmarkAlreadyExistsError({ cafeId });

    await prisma.userBookmark.create({
      data: {userId: Number(userId), cafeId: Number(cafeId),},
    });

    return { cafeId: cafeId.toString() };
  } catch (err) {
    throw err instanceof Error ? err : new InternalServerError('북마크 저장 실패', err);
  }
};
 
// 카페 북마크 삭제 
export const removeBookmarkService = async (userId, cafeId) => {
  try {
    const bookmark = await prisma.userBookmark.findUnique({
      where: {
        userId_cafeId: {
          userId: Number(userId),
          cafeId: Number(cafeId),
        },
      },
    });

    if (!bookmark) throw new BookmarkNotFoundError({ cafeId });

    await prisma.userBookmark.delete({
      where: {
        userId_cafeId: {
          userId: Number(userId),
          cafeId: Number(cafeId),
        },
      },
    });

    return { cafeId: cafeId.toString() };
  } catch (err) {
    throw err instanceof Error ? err : new InternalServerError('북마크 삭제 실패', err);
  }
};
