import express from "express";
import { test, isCorrectCafeId } from "../middlewares/cafe-middleware.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import {
  cafeSearch,
  getCafeMapData,
  cafeDetail,
} from "../controllers/seach.controller.js";

const router = express.Router();
//router.use(authenticateJWT);
router.use(test);

//페이지네이션 구현 필요
router.post("/search", cafeSearch); // 검색 + 카테고리필터

router.get("/map", getCafeMapData); // 지도 마커 데이터

router.get("/:cafeId", isCorrectCafeId, cafeDetail);

export default router;
