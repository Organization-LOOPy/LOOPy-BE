import express from 'express';
import { createCouponTemplateController,
         getOwnerCouponListController,
         terminateCouponController } from '../controllers/coupon.controller.js';

const router = express.Router();

// 사장님 쿠폰 생성
router.post('/:cafeId/coupons', createCouponTemplateController);

// 사장님 쿠폰 목록 조회
router.get('/:cafeId/coupons', getOwnerCouponListController);

router.patch('/:cafeId/coupons/:couponId/terminate', terminateCouponController);

export default router;
