import express from "express";
import {
  getCafe,
  getCafeStamp,
  getCafeCoupon,
  addCafeCoupon,
  getCafeReview,
} from "../controllers/cafeController.js";

import { isCorectCafeId, isMyCoupon } from "../middlewares/cafeMiddleware.js";

const router = express.Router();

router.use(isCorectCafeId); // 카페 ID 유효성 검사

router.get("/", getCafe);

router.get("/mystamp", getCafeStamp);

router.get("/coupon", getCafeCoupon);

router.post("/coupon", isMyCoupon, addCafeCoupon);

router.get("/review", getCafeReview);
