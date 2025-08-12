import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const ACTION_SECRET = process.env.ACTION_TOKEN_SECRET;
if (!ACTION_SECRET) {
  throw new Error('ACTION_TOKEN_SECRET is not set');
}

export const signActionToken = ({
  userId,
  cafeId = null,     
  scope,           
  ttlSec = 300,
  jti = crypto.randomUUID(),
}) => {
  const payload = {
    sub: String(userId),
    cafeId: cafeId ?? null,
    scope,
    jti,
  };
  return jwt.sign(payload, ACTION_SECRET, {
    algorithm: 'HS256',
    expiresIn: ttlSec,
  });
};

export const verifyActionTokenJwt = (token) => {
  return jwt.verify(token, ACTION_SECRET);
};

// --- 아래 내용을 actionToken.js 맨 아래에 추가 ---

// 간단한 in-memory JTI store (프로덕션은 Redis/DB 권장)
const jtiStore = new Map(); // jti -> expiresAt(ms)

// 만료된 JTI 청소
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of jtiStore) {
    if (exp <= now) jtiStore.delete(jti);
  }
}, 60_000).unref();

/** 이미 사용된 jti인지 확인 */
export const isJtiUsed = async (jti) => {
  const exp = jtiStore.get(jti);
  if (!exp) return false;
  if (exp <= Date.now()) {
    jtiStore.delete(jti);
    return false;
  }
  return true;
};

/** jti를 사용 처리 */
export const markJtiUsed = async (jti, ttlSec = 300) => {
  jtiStore.set(jti, Date.now() + ttlSec * 1000);
  return true;
};
