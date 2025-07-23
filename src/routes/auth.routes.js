import express from 'express';
import { signup, login, logout } from '../controllers/auth.controller.js';
import { handleKakaoRedirect, handleKakaoLinkCallback } from '../controllers/auth.kakaoController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import passport from '../config/passport.js';

const router = express.Router();


router.post('/signup', signup);
router.post('/login', login);
router.get('/link/kakao/callback', handleKakaoLinkCallback);
router.get('/kakao/redirect', handleKakaoRedirect);

router.use(authenticateJWT);

// 사용자 인증 
router.post('/logout', passport.authenticate('jwt', { session: false }), logout);

export default router;
