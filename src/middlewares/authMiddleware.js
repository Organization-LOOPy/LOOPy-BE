import passport from "passport";

export const authenticateJWT = (req, res, next) => {
  /* if (process.env.NODE_ENV === 'dev') {
    const debugMode = req.headers['x-debug-mode']?.toLowerCase();

    let currentRole = 'CUSTOMER';
    if (debugMode === 'owner') {
      currentRole = 'OWNER';
    }

    req.user = {
      id: 1,
      roles: ['CUSTOMER', 'OWNER'], 
      currentRole,
    };

    return next();
  }
    */
  console.log("[DEBUG] JWT_SECRET:", process.env.JWT_SECRET);

  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err || !user) {
      return res.status(401).json({ message: "유효하지 않은 인증입니다." });
    }

    req.user = user;
    next();
  })(req, res, next);
};
