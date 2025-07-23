import express from 'express';
import passport from 'passport';
import { getMyStampBooks, getStampBookDetail } from '../controllers/stamp.controller.js';
import { convertStampToPoint } from '../controllers/stamp.controller.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { addStamp } from '../controllers/stamp.controller.js';

const router = express.Router();

router.get('/', authenticateJWT, getMyStampBooks);
router.get(
  '/:stampBookId',
  passport.authenticate('jwt', { session: false }),
  getStampBookDetail
);
router.post(
    '/me/stampbooks/:stampBookId/stamps',
    authenticateJWT,
    addStamp
  );
router.post("/:stampBookId/convert", authenticateJWT, convertStampToPoint);

export default router;





