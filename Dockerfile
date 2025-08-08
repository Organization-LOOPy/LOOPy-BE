FROM node:18-alpine

# 시스템 패키지 설치
RUN apk add --no-cache curl

# pnpm 설치
RUN npm install -g pnpm

# 비root 사용자 먼저 생성
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 작업 디렉토리 생성 및 권한 설정
WORKDIR /app

# package.json과 lock 파일 먼저 복사하고, 권한 설정
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml ./

# nodejs 사용자로 전환 후 의존성 설치
USER nodejs
RUN pnpm install --frozen-lockfile

# 나머지 소스 복사 (권한은 자동 설정됨)
COPY --chown=nodejs:nodejs . .

# Prisma 클라이언트 생성
RUN pnpm exec prisma generate

# 로그 디렉토리 생성
RUN mkdir -p /app/logs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD sh -c "npx prisma migrate deploy && pnpm start"
