import express from 'express';
import { signup, login } from '../controllers/auth.controller.js';
import { handleKakaoRedirect, handleKakaoLinkCallback } from '../controllers/auth.kakaoController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/link/kakao/callback', authenticateJWT, handleKakaoLinkCallback);
router.get('/kakao/redirect', handleKakaoRedirect);

export default router;
