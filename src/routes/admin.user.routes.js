import express from "express";
import {
  getUserByPhone,
  addStampToUser,
  verifyQRToken,
  useUserPoint,
  useUserCoupon,
} from "../controllers/admin.user.controller.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateJWT);

router.get("/users/search", getUserByPhone);
router.post("/users/:userId/stamps", addStampToUser);
router.post("/qrs/verify", verifyQRToken);
router.patch("/users/:userId/points", useUserPoint);
router.patch("/users/:userId/coupons/:couponId", useUserCoupon);

export default router;
