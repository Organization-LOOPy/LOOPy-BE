import express from "express";
import { test, isCorrectCafeId } from "../middlewares/cafeMiddleware.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import {
  cafeSearch,
  getCafeMapData,
  getRegion,
  cafeDetail,
} from "../controllers/seachController.js";

const router = express.Router();
//router.use(authenticateJWT);
router.use(test);

router.post("/search", cafeSearch); // 검색 + 카테고리필터
router.get("/map", getCafeMapData); // 지도 마커 데이터
router.get("/search/region", getRegion); // 지역 정보 전송
router.get("/:cafeId", isCorrectCafeId, cafeDetail);
export default router;
