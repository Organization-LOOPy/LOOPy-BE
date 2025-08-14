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
        // 1) id 정규화
        const userId = Number(payload.userId ?? payload.id);
        if (!Number.isInteger(userId)) return done(null, false);

        // 2) 사용자 존재 확인
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!user) return done(null, false);

        // 3) roles 정규화 (배열 유지 + 대문자)
        const roles = (payload.roles ?? [])
          .map((r) => String(r).toUpperCase());

        // 4) 단일 role 가려낼 때는 OWNER 우선
        let role =
          payload.currentRole?.toUpperCase?.() ??
          (roles.includes('OWNER') ? 'OWNER'
            : (payload.role?.toUpperCase?.() ?? roles[0] ?? null));

        // 5) cafeId: 토큰에 없으면 OWNER일 때 DB에서 찾아 주입
        let cafeId = payload.cafeId ?? null;
        if (!cafeId && roles.includes('OWNER')) {
          const ownerCafe = await prisma.cafe.findFirst({
            where: { ownerId: user.id },   // schema.prisma에서 @map("owner_id") 매핑 OK
            select: { id: true },
          });
          cafeId = ownerCafe?.id ?? null;
        }

        // 🔑 여기서 roles 배열을 반드시 넣어준다!
        return done(null, { id: user.id, role, roles, cafeId });
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

export default passport;
