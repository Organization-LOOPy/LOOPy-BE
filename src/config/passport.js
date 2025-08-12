import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

const jwtFromRequest = (req) => {
  if (!req || !req.headers) return null;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

passport.use(
  new JwtStrategy(
    { jwtFromRequest, secretOrKey: JWT_SECRET, ignoreExpiration: false },
    async (payload, done) => {
      try {
        const userId = Number(payload.userId ?? payload.id);
        if (!Number.isInteger(userId)) return done(null, false);

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!user) return done(null, false);
        const role = payload.currentRole ?? payload.role ?? payload.roles?.[0] ?? null;
        const cafeId = payload.cafeId ?? null;

        return done(null, { id: user.id, role, cafeId });
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

export default passport;