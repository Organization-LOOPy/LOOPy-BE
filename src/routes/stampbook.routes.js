import express from "express";
import { issueRewardCoupon } from "../controllers/stampbook.controller.js";
import { getMyStampBooks } from "../controllers/stamp.controller.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authenticateJWT);

router.get("/stampbooks", getMyStampBooks);
router.post("/:cafeId/coupon", issueRewardCoupon);

export default router;
