import { verifyActionTokenJwt, markJtiUsed, isJtiUsed } from "../actionToken.js";

export const verifyActionToken = (purpose) => async (req, res, next) => {
  const token = req.headers['x-action-token'];
  if (!token) return res.fail('액션 토큰 누락', 401);
  try {
    const p = verifyActionTokenJwt(token);
    if (p.purpose !== purpose) return res.fail('목적 불일치', 403);
    if (p.cafeId !== req.user.cafeId) return res.fail('카페 불일치', 403);
    if (await isJtiUsed(p.jti)) return res.fail('이미 사용된 토큰', 409);
    req.actionToken = p;
    await markJtiUsed(p.jti);
    next();
  } catch (e) {
    return res.fail('유효하지 않은/만료된 토큰', 401);
  }
};