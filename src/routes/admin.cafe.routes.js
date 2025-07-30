import express from 'express';
import { 
    postCafeBasicInfo, 
    patchCafeOperationInfo,
    postCafeMenu, 
    postCafePhotos, 
    completeCafeRegistration, 
    getCafe, 
    updateCafe,
    getMyCafePhoto,
    deleteMyCafePhoto 
} from '../controllers/admin.cafe.controller.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateJWT);

router.post('/basic-info', postCafeBasicInfo);
router.patch('/operation', patchCafeOperationInfo);
router.post('/menus', postCafeMenu);
router.post('/photos', postCafePhotos);
router.patch('/complete',completeCafeRegistration);

router.get('/myCafe', getCafe);
router.patch('/myCafe', updateCafe);
router.get('/photos', getMyCafePhoto);
router.delete('/photos/:photoId', deleteMyCafePhoto);

export default router;
