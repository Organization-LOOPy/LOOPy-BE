import express from "express";
import {
  getUserByPhone,
  addStampToUser,
  verifyQRToken,
  useUserPoint,
  useUserCoupon,
  verifyChallengeForUser,
} from "../controllers/admin.user.controller.js";

import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { requireCafeContext } from "../middlewares/requireCafeContext.js";
import { verifyActionToken } from "../utils/verifyActionToken.js";
import { attachCafeId } from "../middlewares/attachCafeId.js";

const router = express.Router();

router.use(authenticateJWT(['OWNER'])); 
router.use(attachCafeId());      
router.use(requireCafeContext());            

router.get("/users/search", getUserByPhone);

router.post(
  "/users/:userId/stamps",
  verifyActionToken("ADD_STAMP", { required: false, strictCafe: false }),
  addStampToUser
);

router.post("/qrs/verify", verifyQRToken);

router.post(
  "/users/:userId/points/use",
  verifyActionToken("USE_POINT", { required: false, strictCafe: false }),
  useUserPoint
);

router.patch(
  "/users/:userId/coupons/:couponId",
  verifyActionToken("USE_COUPON", { required: false, strictCafe: false }),
  useUserCoupon
);

router.post(
  "/users/:userId/challenges/:challengeId/verify",
  verifyActionToken("VERIFY_CHALLENGE", { required: false, strictCafe: false }),
  verifyChallengeForUser
);

export default router;

