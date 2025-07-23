import passport from "passport";

export const authenticateJWT = (req, res, next) => {
    if (process.env.NODE_ENV === 'dev') {
      req.user = { id: 1, role: 'CUSTOMER' }; // 임시 유저
      return next();
    }
  
    return passport.authenticate("jwt", { session: false })(req, res, next);
  };