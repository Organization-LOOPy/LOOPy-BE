import nodemailer from 'nodemailer';
import { EmailSendFailedError } from "../errors/customErrors.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(email, code) {
  try {
    console.log('[EMAIL DEBUG]', {
  user: process.env.EMAIL_USER,
  hasPassword: !!process.env.EMAIL_PASSWORD,
});

await transporter.verify();
console.log('✅ SMTP 연결 성공');

    await transporter.sendMail({
      from: '"LOOPy" <no-reply@loopy.app>',
      to: email,
      subject: "[LOOPy] 이메일 인증 코드",
      text: `아래 인증 코드를 입력해주세요.

인증 코드: ${code}

본 코드는 5분 후 만료됩니다.
      `,
    });
  } catch (error) {
    throw new EmailSendFailedError();
  }
}