import passport from '../config/passport.js';

const build = (roles = []) => (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) {
      return res.error({ errorCode: 'UNAUTHORIZED', reason: '인증 필요', data: null }, 401);
    }

    const roleFromUser = user.currentRole ?? user.role ?? (Array.isArray(user.roles) ? user.roles[0] : undefined);

    if (roles.length && !roles.includes(roleFromUser)) {
      return res.error({ errorCode: 'FORBIDDEN', reason: '권한 없음', data: null }, 403);
    }

    req.user = user;
    next();
  })(req, res, next); 
};

/**
 * 호환 래퍼:
 *  - 옛 스타일: authenticateJWT(req,res,next)  -> roles 없이 바로 인증
 *  - 새 스타일: authenticateJWT(['OWNER'])   -> 역할 체크 포함 미들웨어 반환
 */
export function authenticateJWT(arg1, arg2, arg3) {
  if (arg1 && typeof arg1 === 'object' && 'headers' in arg1 && typeof arg2 === 'object' && typeof arg3 === 'function') {
    return build([])(arg1, arg2, arg3);
  }
  const roles = Array.isArray(arg1) ? arg1 : [];
  return build(roles);
}

export const authenticateOwner = build(['OWNER']);
export const authenticateAdmin = build(['ADMIN']);
