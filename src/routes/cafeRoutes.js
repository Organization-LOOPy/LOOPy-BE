import express from "express";
import {
  getCafe,
  getCafeStamp,
  getCafeCoupon,
  addCafeCoupon,
  getCafeReview,
  addCafeBookmark,
} from "../controllers/cafeController.js";

import { isCorrectCafeId, isMyCoupon } from "../middlewares/cafeMiddleware.js";

const router = express.Router();

router.get("/review", getCafeReview);

router.post("/bookmark", addCafeBookmark);

router.use(isCorrectCafeId); // 카페 ID 유효성 검사

router.get("/", getCafe);

router.get("/mystamp", getCafeStamp);

router.get("/coupon", getCafeCoupon);

router.post("/coupon", isMyCoupon, addCafeCoupon);
