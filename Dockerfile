FROM node:18-alpine

# 런타임에 필요한 최소 패키지
RUN apk add --no-cache curl

# pnpm 설치
RUN npm install -g pnpm

# 비 root 사용자
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 앱 디렉토리
WORKDIR /app
RUN chown -R nodejs:nodejs /app

# Node 의존성(캐시 최적화)
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml ./
USER nodejs
RUN pnpm install --frozen-lockfile

# 나머지 소스 복사
COPY --chown=nodejs:nodejs . .

# Prisma 클라이언트 생성
RUN pnpm exec prisma generate

# 로그 디렉토리
RUN mkdir -p /app/logs

# 환경변수
ENV NODE_ENV=production
ENV PORT=3000

# 포트/헬스체크
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 마이그레이션 + 앱 실행
CMD ["sh", "-c", "npx prisma migrate deploy && pnpm start"]
