// src/middlewares/requireCafeContext.js
// 사장님 토큰에 cafeId가 반드시 있어야 하는 가드

export const requireCafeContext = () => (req, res, next) => {
    const cafeId = req.user?.cafeId;
  
    if (cafeId === undefined || cafeId === null) {
      return res.error(
        { errorCode: 'CAFE_REQUIRED', reason: '사장님 토큰에 카페 정보가 없습니다.', data: null },
        403
      );
    }
  
    // 숫자 정상화
    const numCafeId = Number(cafeId);
    if (!Number.isInteger(numCafeId) || numCafeId <= 0) {
      return res.error(
        { errorCode: 'CAFE_INVALID', reason: '유효한 카페 ID가 아닙니다.', data: null },
        400
      );
    }
  
    // 이후 미들웨어/컨트롤러에서 숫자 보장
    req.user.cafeId = numCafeId;
    next();
  };
  
  export default requireCafeContext;
  