import express from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { getStampStats } from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(authenticateJWT);
router.get('/stamp-stats', getStampStats);

export default router;