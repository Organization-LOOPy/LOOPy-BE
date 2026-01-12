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

// 챌린지 목록 조회
router.get("/", authenticateJWT, getChallengeList);

// 나의 챌린지 목록 조회 (/:challengeId 보다 먼저 정의해야 함)
router.get("/my", authenticateJWT, getMyChallengeList);

// 챌린지 상세 조회
router.get("/:challengeId", authenticateJWT, getChallengeDetail);

// 챌린지 참여 가능 매장 목록 조회
router.get("/:challengeId/stores", authenticateJWT, getAvailableStoresForChallenge);

// 챌린지 완료 처리
router.post("/:challengeId/complete", authenticateJWT, completeChallenge);

// 챌린지 참여
router.post("/:cafeId/:challengeId/participate", authenticateJWT, participateInChallenge);

export default router;
