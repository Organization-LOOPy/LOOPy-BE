import { createCouponTemplateService } from "../services/coupon.service.js";

export const createCouponTemplateController = async (req, res) => {
    try {
      const cafeId = Number(req.params.cafeId);
      const data = req.body;

      if (isNaN(cafeId)) {
        return res.status(400).json({
          errorCode: "CP_INVALID_ID",
          reason: "잘못된 카페 ID입니다.",
          data: null,
        });
      }
  
      const newCoupon = await createCouponTemplateService(cafeId, data);
  
      return res.status(201).json({
        message: '쿠폰이 성공적으로 생성되었습니다.',
        data: newCoupon,
      });
    } catch (err) {
      return res.error(err);
    }
  };
  