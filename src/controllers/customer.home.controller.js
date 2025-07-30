import { getHomeInfo } from '../services/customer.home.service.js';
 
export const getHomeController = async (req, res, next) => {
  try {
    const userId = Number(req.user.Id); 
    console.log('[DEBUG] controller userId:', userId);
    const homeInfo = await getHomeInfo(Number(userId));

    res.status(200).json({
      message: '홈 정보 조회 성공',
      data: homeInfo,
    });
  } catch (err) {
    next(err);
  }
};