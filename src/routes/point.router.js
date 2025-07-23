import express from 'express';
import { getCurrentPoint, 
  getUserPointTransactions } from '../controllers/point.controller.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateJWT);

// 포인트 조회 
router.get('/current', getCurrentPoint);
router.get('/transactions', getUserPointTransactions);

export default router;
