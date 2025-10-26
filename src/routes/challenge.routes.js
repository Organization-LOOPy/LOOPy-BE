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
router.get("/", getChallengeList); 
router.get("/:challengeId/cafes", authenticateJWT, getAvailableStoresForChallenge); 
router.get("/:challengeId", authenticateJWT, getChallengeDetail); 
router.post(
  "/:cafeId/challenges/:challengeId/join",
  authenticateJWT,
  participateInChallenge
); // 챌린지 참여
router.post("/:challengeId/complete", authenticateJWT, completeChallenge); 

export default router;