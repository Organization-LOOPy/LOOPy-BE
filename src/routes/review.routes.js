import express from "express";
import {
  createReview,
  updateReview,
  deleteReview,
  getMyReviews
} from "../controllers/review.controller.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { validateReview } from "../middlewares/validateReview.js";
import { verifyStamp } from "../middlewares/verifyStamp.js";

const router = express.Router();

// 모든 리뷰 라우터는 인증 필요
router.use(authenticateJWT);

// 리뷰 작성
router.post("/cafe/:cafeId/review", validateReview, verifyStamp, createReview);

// 리뷰 수정
router.patch("/:reviewId", validateReview, updateReview);

// 리뷰 삭제
router.delete("/:reviewId", deleteReview);

// 내 리뷰 목록 조회
router.get("/users/me/reviews", getMyReviews);

export default router;
