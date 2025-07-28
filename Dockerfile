FROM node:18-alpine

# 시스템 패키지 설치
RUN apk add --no-cache curl

# pnpm 설치
RUN npm install -g pnpm

WORKDIR /app

# 비root 사용자 먼저 생성
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 종속성 설치 (root로 실행)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# Prisma 클라이언트 생성
RUN pnpm exec prisma generate

# 로그 디렉토리 생성 및 권한 설정
RUN mkdir -p /app/logs

# 모든 파일 소유권을 nodejs 사용자로 변경 (마지막에!)
RUN chown -R nodejs:nodejs /app

# 이제 nodejs 사용자로 전환
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["pnpm", "start"]