import express from "express";
import {
  getCafe,
  getCafeStamp,
  getCafeCoupon,
  issueCafeCouponToUser,
  getCafeReviews,
} from "../controllers/cafeController.js";

import { isCorrectCafeId, isMyCoupon } from "../middlewares/cafeMiddleware.js";
import e from "express";

const router = express.Router();

router.get("/review", getCafeReviews);

router.use(isCorrectCafeId); // 카페 ID 유효성 검사

router.get("/", getCafe);

router.get("/mystamp", getCafeStamp);

router.get("/coupon", getCafeCoupon);

router.post("/coupon", isMyCoupon, issueCafeCouponToUser);

export default router;
