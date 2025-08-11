import jwt from 'jsonwebtoken';
const ACTION_SECRET = process.env.ACTION_TOKEN_SECRET;

export const signActionToken = ({ userId, cafeId, purpose, ttlSec = 120 }) => {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { userId, cafeId, purpose, jti },
    ACTION_SECRET,
    { algorithm: 'HS256', expiresIn: ttlSec }
  );
};

export const verifyActionTokenJwt = (token) => {
  return jwt.verify(token, ACTION_SECRET); 
};