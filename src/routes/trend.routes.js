import express from 'express';
import { getPopularCafeMenus } from '../controllers/trend.controller.js';

const router = express.Router();

router.get('/menus', getPopularCafeMenus);

export default router;