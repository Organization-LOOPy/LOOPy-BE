import express from 'express';
import multer from 'multer';
import { 
    uploadStampImages, 
    postStampPolicy,
    patchStampPolicy,
    getStampPolicy,
    deleteStampImage,
    getMyStampImages
 } from '../controllers/admin.stamp.controller.js';
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateJWT);
router.post(
    '/stamp-images', 
    upload.array('images', 2), 
    uploadStampImages
);
router.delete('/stamp-images/:imageId', deleteStampImage);
router.post('/stamp-policy', postStampPolicy);
router.patch('/stamp-policy', patchStampPolicy);
router.get('/stamp-policy', getStampPolicy);
router.get('/stamp-images', getMyStampImages);     

export default router;