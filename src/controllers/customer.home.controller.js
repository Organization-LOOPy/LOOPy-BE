import { getMyInfo } from './user.service.js';
import { getCurrentPointByUserIdService } from './point.service.js';

export const getHomePage = async (req, res, next) => {
    try {
        const user = await getMyInfoService(req.user.id);
        const point = await getCurrentPointByUserIdService(req.user.id);

        return res.success({
      message: '현재 포인트 조회 성공',
      currentPoint: point,
    });
      } catch (err) {
        next(err);
      }
}