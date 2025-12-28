import { Router } from 'express';
import { verificationController } from '../controllers/verificationController.js';

const verificationRouter = Router();

verificationRouter.post(
  '/email/request',
  verificationController.requestEmailVerification
);

verificationRouter.post(
  '/email/verify',
  verificationController.verifyEmailCode
);

export default verificationRouter;
