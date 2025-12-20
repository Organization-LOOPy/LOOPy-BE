import { verificationService } from '../services/verificationService.js';

export const verificationController = {
  async requestEmailVerification(req, res, next) {
    try {
      const { email } = req.body;

      await verificationService.requestEmailVerification(email);

      res.status(200).json({
        success: true,
        message: '인증 이메일을 전송했습니다.',
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyEmailCode(req, res, next) {
    try {
      const { email, code } = req.body;

      await verificationService.verifyEmailCode(email, code);

      res.status(200).json({
        success: true,
        message: '이메일 인증이 완료되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  },
};
