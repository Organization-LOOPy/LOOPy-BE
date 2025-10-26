import express from "express";

// controllers
import {
  getMyStampBooks,
  getStampBookDetail,
  convertStampToPoint,
  extendStampBook,
  getConvertedStampbooks,
  getTotalStampCount,
  getLoopyLevelInfo,
  getExpiringStampBooks,
  getMyStampByCafe,
  issueRewardCoupon,
} from "../controllers/stamp.controller.js";

// middlewares
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 인증 미들웨어 공통 적용
router.use(authenticateJWT);

// 사용자 스탬프북 관련
router.get("/users/me/stampbooks", getMyStampBooks);
router.get("/users/me/stampbooks/expiring", getExpiringStampBooks);
router.get("/users/me/stampbooks/converted", getConvertedStampbooks);
router.get("/users/me/stampbooks/total-count", getTotalStampCount);
router.get("/users/me/stampbooks/loopy-level", getLoopyLevelInfo);
router.get("/users/me/stampbooks/:stampBookId", getStampBookDetail);
router.post("/users/me/stampbooks/:stampBookId/convert", convertStampToPoint);
router.patch("/users/me/stampbooks/:stampBookId/extend", extendStampBook);

// 특정 카페별 내 스탬프 조회
router.get("/cafes/:cafeId/my-stamp", getMyStampByCafe);

// 스탬프북 쿠폰 발급
router.post("/stampbooks/:cafeId/coupon", issueRewardCoupon);
router.post("/:cafeId/coupon", issueRewardCoupon);

export default router;
