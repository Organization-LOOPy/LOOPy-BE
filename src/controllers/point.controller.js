import { getPointTransactionsByUserId, getCurrentPointByUserIdService } from '../services/pointService.js';

export const getCurrentPoint = async (req, res, next) => {
  try {
    const point = await getCurrentPointByUserIdService(req.user.id);
    return res.success({
      message: '현재 포인트 조회 성공',
      currentPoint: point,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserPointTransactions = async (req, res, next) => {
  try {
    const userId = req.user.id; 
    const transactions = await getPointTransactionsByUserId(userId);

    res.status(200).json({
      message: '포인트 내역 조회 성공',
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};
