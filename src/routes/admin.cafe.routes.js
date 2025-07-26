import express from 'express';
import { createCafe, getCafe, updateCafe } from '../controllers/admin.cafe.controller.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateJWT);

router.post('/cafe', createCafe);
router.get('/cafe', getCafe);
router.patch('/cafe/:cafeId', updateCafe);

export default router;
