import express from "express";
import { issueRewardCoupon, useUserCouponController } from "../controllers/stampbook.controller.js";
import { getMyStampBooks } from "../controllers/stamp.controller.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authenticateJWT);
 
// 스탬프북 쿠폰 발급 라우트
router.post("/stampbooks/:cafeId/coupon", issueRewardCoupon);

// 쿠폰 사용 라우트
router.patch("/user-coupons/:userCouponId", useUserCouponController);

router.get("/stampbooks", getMyStampBooks);


export default router;

