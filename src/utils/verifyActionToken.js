import { verifyActionTokenJwt, isJtiUsed } from '../utils/actionToken.js';

// 원하는 스코프를 인자로 받음
export const verifyActionToken = (expected, { required = true, strictCafe = true } = {}) => {
  return async (req, res, next) => {
    const token = req.get('x-action-token');
    if (!token) {
      if (required) return res.fail('액션 토큰 누락', 401);
      return next();
    }
    try {
      const p = verifyActionTokenJwt(token);

      // 재사용 차단
      if (p.jti && (await isJtiUsed(p.jti))) {
        return res.fail('이미 사용된 액션 토큰', 403);
      }

      const actual = p.scope ?? p.purpose; // 하위호환
      if (actual !== expected) return res.fail('목적 불일치', 403);

      if (
        strictCafe &&
        p.cafeId != null &&
        req.user?.cafeId != null &&
        Number(p.cafeId) !== Number(req.user.cafeId)
      ) {
        return res.fail('카페 불일치', 403);
      }
      req.actionToken = p;
      next();
    } catch {
      return res.fail('유효하지 않은/만료된 토큰', 401);
    }
  };
};
