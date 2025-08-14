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

        // roles, role, cafeId 계산
        const roles = (payload.roles ?? []).map((r) => String(r).toUpperCase());

        let role =
          payload.currentRole?.toUpperCase?.() ??
          (roles.includes("OWNER")
            ? "OWNER"
            : payload.role?.toUpperCase?.() ?? roles[0] ?? null);

        let cafeId = payload.cafeId ?? null;
        if (!cafeId && roles.includes("OWNER")) {
          const ownerCafe = await prisma.cafe.findFirst({
            where: { ownerId: user.id },
            select: { id: true },
          });
          cafeId = ownerCafe?.id ?? null;
        }

        // 최종 user 객체 전달
        return done(null, { id: user.id, role, roles, cafeId });
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

export default passport;