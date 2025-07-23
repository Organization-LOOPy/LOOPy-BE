import {
  getBookmarkedCafesService,
  addBookmarkService,
  removeBookmarkService,
} from '../services/user.bookmark.service.js';

export const getBookmarkedCafes = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const bookmarks = await getBookmarkedCafesService(userId);
    return res.success({
      message: '북마크한 카페 목록 조회 성공',
      bookmarks,
    });
  } catch (err) {
    next(err);
  }
};

export const addBookmark = async (req, res, next) => {
  const userId = req.user.id;
  const { cafeId } = req.body;

  try {
    const result = await addBookmarkService(userId, cafeId);
    return res.success({
      message: '북마크가 저장되었습니다.',
      cafeId: result.cafeId,
    });
  } catch (err) {
    next(err);
  }
};

export const removeBookmark = async (req, res, next) => {
  const userId = req.user.id;
  const { cafeId } = req.params;

  try {
    const result = await removeBookmarkService(userId, cafeId);
    return res.success({
      message: '북마크가 삭제되었습니다.',
      cafeId: result.cafeId,
    });
  } catch (err) {
    next(err);
  }
};
