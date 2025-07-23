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

router.get("/", getChallengeList); // 챌린지 목록 조회
router.get("/:challengeId/stores", authenticateJWT, getAvailableStoresForChallenge); // 참여 가능 매장 조회
router.get("/:challengeId", authenticateJWT, getChallengeDetail); // 챌린지 상세 조회
router.post("/:challengeId/participate", authenticateJWT, participateInChallenge); // 챌린지 참여
router.get('/me/challenges', authenticateJWT, getMyChallengeList); // 나의 챌린지 조회
router.post('/:challengeId/complete', authenticateJWT, completeChallenge);

export default router;
