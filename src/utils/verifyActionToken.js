import { verifyActionTokenJwt } from "../utils/actionToken.js";
// isJtiUsed, markJtiUsed 는 여기서 소모하지 않을 거라 import 안 해도 됨

// 옵션형으로 확장: required/strictCafe
export const verifyActionToken = (purpose, { required = true, strictCafe = true } = {}) => {
  return async (req, res, next) => {
    const token = req.get('x-action-token'); // 헤더 키 안전 접근
    if (!token) {
      if (required) return res.fail('액션 토큰 누락', 401);
      return next(); // 선택이면 통과
    }

    try {
      const p = verifyActionTokenJwt(token);

      // 목적 일치 확인
      if (p.purpose !== purpose) {
        return res.fail('목적 불일치', 403);
      }

      // (선택) 유저 일치 확인: 토큰에 userId가 있으면 라우트 파라미터와 매칭
      if (p.userId != null && req.params?.userId != null) {
        if (Number(p.userId) !== Number(req.params.userId)) {
          return res.fail('유저 불일치', 403);
        }
      }

      // 카페 일치 확인 (token.cafeId가 있을 때만 검사; 타입캐스팅해서 비교)
      if (strictCafe && p.cafeId != null && req.user?.cafeId != null) {
        if (Number(p.cafeId) !== Number(req.user.cafeId)) {
          return res.fail('카페 불일치', 403);
        }
      }
      
      req.actionToken = p;
      return next();
    } catch (e) {
      return res.fail('유효하지 않은/만료된 토큰', 401);
    }
  };
};
