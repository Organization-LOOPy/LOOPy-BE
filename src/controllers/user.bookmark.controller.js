import prisma from '../../prisma/client.js';
import {
  UserNotFoundError,
  InternalServerError,
  BookmarkAlreadyExistsError,
  CafeNotFoundError,
  BadRequestError, 
  BookmarkNotFoundError
} from '../errors/customErrors.js';

// 내가 북마크한 카페 조회 
export const getBookmarkedCafes = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const bookmarks = await prisma.userBookmark.findMany({
      where: { userId },
      include: {
        cafe: true, 
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const cafes = bookmarks.map((bookmark) => ({
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
    }));

    return res.success({
      message: '북마크한 카페 목록 조회 성공',
      bookmarks: cafes,
    });
  } catch (err) {
    return next(new InternalServerError('북마크한 카페 조회 실패', err));
  }
};

export const addBookmark = async (req, res, next) => {
  const userId = req.user.id;
  const { cafeId } = req.body;

  if (!cafeId) {
    return next(new BadRequestError('카페 ID가 필요합니다.'));
  }

  try {
    const cafe = await prisma.cafe.findUnique({
  where: { id: BigInt(cafeId) },
});

if (!cafe) {
  return next(new CafeNotFoundError({ cafeId }));
}

    const existing = await prisma.userBookmark.findUnique({
  where: {
    userId_cafeId: {
      userId: BigInt(userId),
      cafeId: BigInt(cafeId),
    },
  },
});

if (existing) {
  return next(new BookmarkAlreadyExistsError({ cafeId }));
}
    // 북마크 저장
    await prisma.userBookmark.create({
      data: {
        userId: BigInt(userId),
        cafeId: BigInt(cafeId),
      },
    });

    return res.success({
      message: '북마크가 저장되었습니다.',
      cafeId: cafeId.toString(),
    });
  } catch (err) {
    return next(new InternalServerError('북마크 저장 실패', err));
  }
};

// 저장한 북마크 삭제
export const removeBookmark = async (req, res, next) => {
  const userId = req.user.id;
  const { cafeId } = req.params;

  try {
    const bookmark = await prisma.userBookmark.findUnique({
      where: {
        userId_cafeId: {
          userId: BigInt(userId),
          cafeId: BigInt(cafeId),
        },
      },
    });

    if (!bookmark) {
      return next(new BookmarkNotFoundError({ cafeId }));
    }

    await prisma.userBookmark.delete({
      where: {
        userId_cafeId: {
          userId: BigInt(userId),
          cafeId: BigInt(cafeId),
        },
      },
    });

    return res.success({
      message: '북마크가 삭제되었습니다.',
      cafeId: cafeId.toString(),
    });
  } catch (err) {
    return next(new InternalServerError('북마크 삭제 실패', err));
  }
};