import { getStampStatsByCafe } from '../services/dashboard.service.js';

export const getStampStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = await getStampStatsByCafe(userId);

    res.status(200).json({
      message: '스탬프 통계 조회 성공',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
