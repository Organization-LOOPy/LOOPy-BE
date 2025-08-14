import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

// 서버 시작 시 1회: JWT_SECRET 로드 확인
console.log("[BOOT] JWT_SECRET exists?", !!JWT_SECRET);

// 토큰 추출 로거 (토큰 없을 때 바로 힌트)
const jwtFromRequest = (req) => {
  if (!req || !req.headers) return null;
  const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (!token) {
    console.warn("[AUTH] No Bearer token in Authorization header");
  }
  return token;
};

passport.use(
  new JwtStrategy(
    { jwtFromRequest, secretOrKey: JWT_SECRET, ignoreExpiration: false },
    async (payload, done) => {
      try {
        // 1) 원본 페이로드 로깅
        console.log("[AUTH] payload:", payload);

        // 2) userId 계산
        const userId = Number(payload?.userId ?? payload?.id);
        console.log("[AUTH] userId from payload =>", userId);
        if (!Number.isInteger(userId)) {
          console.warn("[AUTH] Invalid userId in token");
          return done(null, false);
        }

        // 3) 사용자 존재 확인
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!user) {
          console.warn("[AUTH] User not found:", userId);
          return done(null, false);
        }

        // 4) roles/role/cafeId 계산
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

        // 5) 계산 결과 로깅
        console.log("[AUTH] computed =>", {
          userId: user.id,
          roles,
          role,
          cafeId,
        });

        // 6) 최종 user 객체 전달
        return done(null, { id: user.id, role, roles, cafeId });
      } catch (err) {
        console.error("[AUTH] Strategy error:", err);
        return done(err, false);
      }
    }
  )
);

export default passport;
