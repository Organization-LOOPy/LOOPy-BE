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

const router = express();

router.use(authenticateJWT);

router.use(isCorrectCafeId); // 카페 ID 유효성 검사

router.get("/:cafeId", getCafe); //카페 정보 조회

router.post("/:cafeId/alram", getNotification);

//router.use(test); // 테스트용 미들웨어, 실제 배포 시 제거

router.get("/:cafeId/review", getCafeReviews); //리뷰 조회

router.post("/:cafeId/coupon", isMyCoupon, issueCafeCouponToUser); //쿠폰 발급

router.post("/:cafeId/bookmark", addBookmark); // 북마크 설정

export default router;
