FROM node:18-alpine

# 1. 시스템 패키지 설치
RUN apk add --no-cache curl

# 2. pnpm 설치
RUN npm install -g pnpm

# 3. 비root 사용자 생성
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 4. 작업 디렉토리 생성 및 권한 부여
WORKDIR /app
RUN chown -R nodejs:nodejs /app

# 5. 패키지 파일 먼저 복사 (캐시 최적화)
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml ./

# 6. nodejs 사용자로 전환 후 의존성 설치
USER nodejs
RUN pnpm install --frozen-lockfile

# 7. 나머지 소스 복사
COPY --chown=nodejs:nodejs . .

# 8. Prisma 클라이언트 생성
RUN pnpm exec prisma generate

# 9. 로그 디렉토리 생성
RUN mkdir -p /app/logs

# 10. 포트 및 헬스체크 설정
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 11. 마이그레이션 + 앱 실행
CMD sh -c "npx prisma migrate deploy && pnpm start"