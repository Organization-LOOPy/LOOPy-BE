#python 빌드
FROM node:18-alpine AS pybuilder
WORKDIR /pybuild

# 네이티브 확장 모듈 빌드용 도구
RUN apk add --no-cache \
  python3 py3-pip python3-dev \
  build-base libffi-dev openssl-dev

# Python 의존성만 먼저 복사(캐시 최적화)
COPY requirements.txt ./

# site-packages 대용 경로 설정
RUN pip3 install --no-cache-dir -r requirements.txt -t /opt/pydeps

# 런타임
FROM node:18-alpine

# 런타임에 필요한 최소 패키지
RUN apk add --no-cache \
  python3 py3-pip curl \
  # ↓ 필요 시 주석 해제 (예: psycopg2 런타임)
  # postgresql-libs \
  # libstdc++ \
  ;

# pnpm 설치
RUN npm install -g pnpm

# 비 root 사용자
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 앱 디렉토리
WORKDIR /app
RUN chown -R nodejs:nodejs /app

# Python deps 복사 + PYTHONPATH 설정
COPY --from=pybuilder /opt/pydeps /opt/pydeps
RUN chown -R nodejs:nodejs /opt/pydeps
ENV PYTHONPATH=/opt/pydeps

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

# 환경변수(원하면 빌드시 --build-arg 로 대체 가능)
ENV NODE_ENV=production
ENV PORT=3000

# 포트/헬스체크
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 마이그레이션 + 앱 실행
CMD sh -c "npx prisma db push --skip-generate && pnpm start"
