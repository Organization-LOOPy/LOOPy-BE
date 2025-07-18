import express from 'express';
import { deactivateUser } from '../controllers/user.controller.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { reactivateUser } from '../controllers/user.controller.js';
import { getMyInfo } from '../controllers/user.controller.js';

const router = express.Router();

router.patch('/me/inactive', authenticateJWT, deactivateUser);
router.patch('/me/activate', authenticateJWT, reactivateUser);
router.get('/me', authenticateJWT, getMyInfo);

export default router;
