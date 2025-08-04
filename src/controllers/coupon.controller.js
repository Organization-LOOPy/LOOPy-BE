//coupon.controller.js

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
      console.log('🔥 req.params:', req.params);       // cafeId 포함 확인
      console.log('🔥 req.body:', req.body);           // 요청 데이터 확인
      console.log('🔥 cafeId:', cafeId);               // 숫자로 변환된지 확인

  
      const newCoupon = await createCouponTemplateService(cafeId, data);
  
      return res.status(201).json({
        message: '쿠폰이 성공적으로 생성되었습니다.',
        data: newCoupon,
      });
    } catch (err) {
      console.error('❌ 쿠폰 생성 중 에러:', err);
      return res.error(err);
    }
  };
  