import express from 'express';
import multer from 'multer';
import { uploadStampImages, postStampPolicy } from '../controllers/admin.stamp.controller.js';
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateJWT);
router.post('/stamp-images', upload.array('images', 2), uploadStampImages);
router.post('/stamp-policy', postStampPolicy);

export default router;