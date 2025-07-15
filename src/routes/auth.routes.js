import express from 'express';
import { signup, login } from '../controllers/auth.controller.js';
import { handleKakaoRedirect } from '../controllers/auth.kakaoController.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/kakao/callback', handleKakaoRedirect);

export default router;
