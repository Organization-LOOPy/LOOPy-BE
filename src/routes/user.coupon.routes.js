import express from "express";
import {
    useUserCouponController,
    getUserCouponsController,
} from "../controllers/user.coupon.controller.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authenticateJWT);

// 사용자 쿠폰 조회
router.get("/user-coupons", getUserCouponsController);

// 사용자 쿠폰 사용
router.patch("/user-coupons/:userCouponId", useUserCouponController);

export default router;
