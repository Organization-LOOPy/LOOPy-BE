import dotenv from 'dotenv';
dotenv.config(); // .env 파일에서 환경변수 불러오기

import jwt from 'jsonwebtoken';

const payload = {
  userId: 1, // 실제 존재하는 유저 ID
  email: 'test@example.com', // 선택적
};

const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error('❌ JWT_SECRET이 .env에서 설정되지 않았습니다.');
  process.exit(1);
}

const token = jwt.sign(payload, secret, { expiresIn: '2h' });

console.log('✅ 생성된 테스트용 JWT 토큰:');
console.log(token);
