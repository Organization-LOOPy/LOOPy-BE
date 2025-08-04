import express from 'express';
import { createCouponTemplateController } from '../controllers/coupon.controller.js';

const router = express.Router();

// 사장님 쿠폰 생성
router.post('/:cafeId/coupons', createCouponTemplateController);

export default router;
