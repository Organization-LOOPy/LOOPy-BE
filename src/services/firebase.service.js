import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { BadRequestError } from '../errors/customErrors.js';

const serviceAccountPath = path.resolve('src/credentials/loopy-beccb-firebase-adminsdk-fbsvc-f278360842.json');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// 클라이언트에게 idToken 전달받고 firebase로 확인 
export const verifyPhoneNumber = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number || decodedToken.phoneNumber;

    if (!phoneNumber) {
      throw new BadRequestError('Firebase 토큰에서 전화번호를 찾을 수 없습니다.');
    }

    return phoneNumber;
  } catch (err) {
    throw new BadRequestError('Firebase ID 토큰이 유효하지 않습니다.', err);
  }
};