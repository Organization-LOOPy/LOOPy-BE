import express from 'express';
import { 
    postCafeBasicInfo, 
    patchCafeOperationInfo,
    postCafeMenu, 
    postCafePhotos, 
    completeCafeRegistration, 
    updateCafe,
    getMyCafePhoto,
    deleteMyCafePhoto,
    getMyCafeMenus,
    getMyCafeBasicInfo,
    getMyCafeBusinessInfo,
    getFirstCafePhotoController
} from '../controllers/admin.cafe.controller.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(authenticateJWT);

router.post('/basic-info', postCafeBasicInfo);
router.patch('/operation', patchCafeOperationInfo);
router.post(
  '/menus',
  upload.single('menuImage'),
  postCafeMenu
);
router.post(
  '/photos', 
  upload.array('photos', 5),
  postCafePhotos
);
router.patch('/complete',completeCafeRegistration);
router.get('/myCafe/basic', getMyCafeBasicInfo);
router.get('/myCafe/operation', getMyCafeBusinessInfo);
router.patch('/myCafe', updateCafe);
router.get('/photos', getMyCafePhoto);
router.delete('/photos/:photoId', deleteMyCafePhoto);
router.get('myCafe/menus', getMyCafeMenus);
router.get('/photos/first', getFirstCafePhotoController);
export default router;
