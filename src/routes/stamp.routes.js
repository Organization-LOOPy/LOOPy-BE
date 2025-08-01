import express from 'express';
import passport from 'passport';

import {
  getConvertedStampbooks,
  getTotalStampCount,
  getMyStampByCafe,
} from '../controllers/stamp.controller.js';

import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

export default router;