import express from "express";
import { issueRewardCoupon } from "../controllers/stampbook.controller.js";
import {
    getMyStampBooks,
    getStampBookDetail,
    addStamp,
    convertStampToPoint,
    extendStampBook,
    getConvertedStampbooks,
    getTotalStampCount,
    getLoopyLevelInfo,
    getExpiringStampBooks,
    getMyStampByCafe,
} from "../controllers/stamp.controller.js";

import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authenticateJWT);


router.get("/users/me/stampbooks", getMyStampBooks);
router.get("/users/me/stampbooks/expiring", getExpiringStampBooks);
router.get("/users/me/stampbooks/converted", getConvertedStampbooks);
router.get("/users/me/stampbooks/total-count", getTotalStampCount);
router.get("/users/me/stampbooks/loopy-level", getLoopyLevelInfo);

router.get("/users/me/stampbooks/:stampBookId", getStampBookDetail);
router.post("/users/me/stampbooks/:stampBookId/stamps", addStamp);
router.post("/users/me/stampbooks/:stampBookId/convert", convertStampToPoint);
router.patch("/users/me/stampbooks/:stampBookId/extend", extendStampBook);
router.get('/cafes/:cafeId/my-stamp', authenticateJWT, getMyStampByCafe);

router.post("/:cafeId/coupon", issueRewardCoupon);

export default router;
