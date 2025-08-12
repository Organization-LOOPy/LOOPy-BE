import express from 'express';
import { sendNotificationToCustomers } from '../controllers/admin.notification.controller.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateJWT);

router.post('/:cafeId/notification', sendNotificationToCustomers);

export default router;
