import express from "express";

const router = express.Router();

router.get("/", getCafe);
router.get("/mystamp", getCafeStamp);
router.get("/coupon", getCafeCoupon);
router.post("/coupon", addCafeCoupon);
router.get("/review", getCafeReview);
