import express from 'express';
import passport from 'passport';

import {
  getMyStampBooks,
  getStampBookDetail,
  addStamp,
  convertStampToPoint,
  cancelStampConversion,
  extendStampBook,
  getExpiringStampBooks,
} from '../controllers/stamp.controller.js';

import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 전체 스탬프북 조회
router.get('/', authenticateJWT, getMyStampBooks);

// 소멸 임박 스탬프북 조회
router.get('/expiring', authenticateJWT, getExpiringStampBooks);

// 스탬프북 상세 조회
router.get(
  '/:stampBookId',
  passport.authenticate('jwt', { session: false }),
  getStampBookDetail
);

// 도장 1개 적립
router.post(
  '/me/stampbooks/:stampBookId/stamps',
  authenticateJWT,
  addStamp
);

// 스탬프 포인트로 환전
router.post(
  '/:stampBookId/convert',
  authenticateJWT,
  convertStampToPoint
);

// 환전 취소 (3일 이내 가능)
router.delete(
  '/:stampBookId/convert',
  authenticateJWT,
  cancelStampConversion
);

// 스탬프북 기간 연장 (최대 1회)
router.patch(
  '/:stampBookId/extend',
  authenticateJWT,
  extendStampBook
);

export default router;