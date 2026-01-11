import express from "express";

import {
  completeChallenge,
} from "../controllers/challenge.controller.js";

import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 챌린지 완료 처리
router.post("/:challengeId/complete", authenticateJWT, completeChallenge);

export default router;
