import prisma from '../../prisma/client.js';
import { sendVerificationEmail } from './emailService.js';
import { generateVerificationCode } from '../utils/generateVerificationCode.js';
import {
  EmailMissingError,
  VerificationCodeMissingError,
  InvalidVerificationCodeError,
  VerificationCodeExpiredError,
} from '../errors/customErrors.js';

const EXPIRE_MINUTES = 5;

export const verificationService = {
  async requestEmailVerification(email) {
    if (!email) {
      throw new EmailMissingError();
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(
      Date.now() + EXPIRE_MINUTES * 60 * 1000
    );

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        expiresAt,
        verified: false,
      },
    });

    await sendVerificationEmail(email, code);
  },

  async verifyEmailCode(email, code) {
    if (!email) {
      throw new EmailMissingError();
    }

    if (!code) {
      throw new VerificationCodeMissingError();
    }

    const verification = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        verified: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!verification) {
      throw new InvalidVerificationCodeError();
    }

    if (verification.expiresAt < new Date()) {
      throw new VerificationCodeExpiredError();
    }

    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { verified: true },
    });
  },
};
