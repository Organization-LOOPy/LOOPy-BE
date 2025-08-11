import express from "express";
import {
  getUserByPhone,
  addStampToUser,
  verifyQRToken,
  useUserPoint,
  useUserCoupon,
  verifyChallengeForUser,
} from "../controllers/admin.user.controller.js";

import { responseHandler } from '../middlewares/responseHandler.js';
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { verifyActionToken } from "../utils/verifyActionToken.js";

const router = express.Router();

router.use(authenticateJWT);
router.use(responseHandler);

router.get("/users/search", getUserByPhone);
router.post("/users/:userId/stamps", verifyActionToken("ADD_STAMP"), addStampToUser);
router.post("/qrs/verify", verifyQRToken);
router.patch("/users/:userId/points", useUserPoint);
router.patch("/users/:userId/coupons/:couponId", useUserCoupon);
router.post("/users/:userId/challenges/:challengeId/verify", verifyChallengeForUser);

export default router;
