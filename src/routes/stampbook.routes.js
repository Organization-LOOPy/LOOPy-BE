import express from "express";
import {
    issueRewardCoupon,
    getMyStampBooks,
} from "../controllers/stampbook.controller.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authenticateJWT);

router.get("/stampbooks", getMyStampBooks);
router.post("/:cafeId/coupon", issueRewardCoupon);

export default router;
