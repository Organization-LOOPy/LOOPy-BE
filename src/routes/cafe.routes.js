import express from "express";
import {
  getCafe,
  issueCafeCouponToUser,
  getCafeReviews,
  addBookmark,
  getNotification,
} from "../controllers/cafe.controller.js";

import {
  isCorrectCafeId,
  isMyCoupon,
  test,
} from "../middlewares/cafeMiddleware.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
const router = express.Router({ mergeParams: true });

router.use(authenticateJWT);

router.use(isCorrectCafeId); // 카페 ID 유효성 검사

router.get("/", getCafe); //카페 정보 조회

router.post("/alram", getNotification);

//router.use(test); // 테스트용 미들웨어, 실제 배포 시 제거

router.get("/review", getCafeReviews); //리뷰 조회

router.post("/coupon", isMyCoupon, issueCafeCouponToUser); //쿠폰 발급

router.post("/bookmark", addBookmark); // 북마크 설정

export default router;
