// notification.routes.js

import express from "express";
import {
  getUserNotifications,
  getNotificationById,
} from "../controllers/notification.controller.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 모든 알림 API는 인증 필요
router.use(authenticateJWT);

router.get("/notifications", getUserNotifications); // 알림 목록 조회

// 알림 상세 조회 -> 알림 읽음 처리
router.get("/notification/:notificationId", getNotificationById);

export default router;
