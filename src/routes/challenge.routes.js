import express from "express";

import {
  getChallengeList,
  getChallengeDetail,
  participateInChallenge,
  getAvailableStoresForChallenge,
  getMyChallengeList,
  completeChallenge,
} from "../controllers/challenge.controller.js";

import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/me", authenticateJWT, getMyChallengeList);
router.get("/", getChallengeList); // 챌린지 목록 조회
router.get("/:challengeId/cafes", authenticateJWT, getAvailableStoresForChallenge); // 참여 가능 매장 조회
router.get("/:challengeId", authenticateJWT, getChallengeDetail); // 챌린지 상세 조회
router.post("/:challengeId/participate", authenticateJWT, participateInChallenge); // 챌린지 참여
router.post("/:challengeId/complete", authenticateJWT, completeChallenge); // 완료 처리

export default router;