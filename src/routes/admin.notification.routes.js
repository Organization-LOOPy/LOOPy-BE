import express from 'express';
import { sendNotificationToCustomers } from '../controllers/owner.notification.controller.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateJWT);

router.post('/cafes/:cafeId/notification', sendNotificationToCustomers);

export default router;
