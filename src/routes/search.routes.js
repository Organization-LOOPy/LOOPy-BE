import express from "express";
import { test, isCorrectCafeId } from "../middlewares/cafeMiddleware.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import {
  cafeSearch,
  getCafeMapData,
  cafeDetail,
} from "../controllers/seach.controller.js";
import {  searchKeywordCounter  } from "../routes/metrics.route.js";

const router = express.Router();

router.use(authenticateJWT);
//router.use(test);

router.post("/list", (req, res, next) => {
  const keyword = req.body?.keyword;

  if (keyword) {
    searchKeywordCounter.inc({ keyword });
  }

  return cafeSearch(req, res, next);
});

router.get("/map", getCafeMapData); // 지도 마커 데이터

router.get("/:cafeId", isCorrectCafeId, cafeDetail);

export default router;
