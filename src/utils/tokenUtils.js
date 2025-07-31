import jwt from 'jsonwebtoken';

export const decodeIdToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    return {
      userId: decoded.sub,
      phoneNumber: decoded.phone_number,
    };
  } catch (err) {
    throw new UnauthorizedError('잘못된 idToken입니다.');
  }
};
