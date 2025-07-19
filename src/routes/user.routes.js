import express from 'express';
import { deactivateUser } from '../controllers/user.controller.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { reactivateUser, updateUserPreferences } from '../controllers/user.controller.js';
import { getMyInfo } from '../controllers/user.controller.js';
import { updateNickname } from '../controllers/user.controller.js';

const router = express.Router();

router.patch('/me/inactive', authenticateJWT, deactivateUser);
router.patch('/me/activate', authenticateJWT, reactivateUser);
router.get('/me', authenticateJWT, getMyInfo);
router.patch('/me/nickname', authenticateJWT, updateNickname);
router.patch('/me/preferences', authenticateJWT, updateUserPreferences);

export default router;
