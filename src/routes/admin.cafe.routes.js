import express from 'express';
import { postCafeBasicInfo, patchCafeOperationInfo, postCafeMenus, 
    postCafePhotos, completeCafeRegistration, 
    getCafe, updateCafe } from '../controllers/admin.cafe.controller.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateJWT);

router.post('/basic-info', postCafeBasicInfo);
router.patch('/:cafeId/operation', patchCafeOperationInfo);
router.post('/:cafeId/menus', postCafeMenus);
router.post('/:cafeId/photos', postCafePhotos);
router.patch('/:cafeId/complete',completeCafeRegistration);

router.get('/cafe', getCafe);
router.patch('/cafe/:cafeId', updateCafe);

export default router;
