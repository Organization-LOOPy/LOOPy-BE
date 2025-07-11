import express from 'express';
import { signup, login } from '../controllers/auth.controller.js';

const router = express.Router();

// 이메일 회원가입
router.post('/signup', signup);
router.post('/login', login);

export default router;
