import { stampBookService, useUserCouponService } from "../services/stampbook.service.js";

export const issueRewardCoupon = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cafeId = parseInt(req.params.cafeId, 10);

    const coupon = await stampBookService.handleStampCompletion(userId, cafeId);
    return res.success({
      message: "리워드 쿠폰 발급 성공",
      coupon,
    });
  } catch (err) {
    next(err);
  }
};

export const useUserCouponController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userCouponId = parseInt(req.params.userCouponId, 10);

    const updatedCoupon = await useUserCouponService(userId, userCouponId);

    return res.status(200).json({
      message: "쿠폰 사용 완료",
      data: updatedCoupon,
    });
  } catch (err) {
    next(err);
  }
};
