import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";

// 임시 비밀키 (나중에 .env로 분리)
const JWT_SECRET = process.env.JWT_SECRET || "loopy-secret";

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

const mockUser = {
  id: 1,
  email: "loopy@example.com",
  name: "루피",
};

passport.use(
  new JwtStrategy(opts, (jwtPayload, done) => {
    // 실제로는 DB에서 유저 검증
    if (jwtPayload && jwtPayload.id === mockUser.id) {
      return done(null, mockUser);
    } else {
      return done(null, false);
    }
  })
);

export default passport;