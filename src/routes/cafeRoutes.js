import express from "express";
import {
  getCafe,
  issueCafeCouponToUser,
  getCafeReviews,
} from "../controllers/cafeController.js";

import {
  isCorrectCafeId,
  isMyCoupon,
  test,
} from "../middlewares/cafeMiddleware.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router({ mergeParams: true });

//router.use(authenticateJWT);

router.use(test); // 테스트용 미들웨어, 실제 배포 시 제거

router.get("/review", getCafeReviews);

router.use(isCorrectCafeId); // 카페 ID 유효성 검사

router.get("/", getCafe);

router.post("/coupon", isMyCoupon, issueCafeCouponToUser);

export default router;
