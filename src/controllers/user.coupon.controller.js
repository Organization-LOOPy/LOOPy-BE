// controllers/user.coupon.controller.js
import { userCouponService } from '../services/user.coupon.service.js';

// 사용 가능한/지난 쿠폰 조회
export const getUserCouponsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const status = req.query.status ?? 'usable'; // 기본값 'usable'
    const coupons = await userCouponService.getUserCoupons(userId, status);
    return res.status(200).json({
      resultType: "SUCCESS",
      data: coupons,
    });
  } catch (err) {
    next(err);
  }
};

// 쿠폰 사용 처리
export const useUserCouponController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userCouponId = Number(req.params.userCouponId, 10);
    const updatedCoupon = await userCouponService.useUserCoupon(userId, userCouponId);
    return res.status(200).json({
      resultType: "쿠폰 사용 완료",
      data: updatedCoupon,
    });
  } catch (err) {
    next(err);
  }
};