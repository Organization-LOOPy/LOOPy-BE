# ⚙️ Base image (공통 세팅)
FROM node:18-alpine AS base

RUN npm install -g pnpm
WORKDIR /app

# 📦 Dependencies 설치 (모든 의존성)
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 🛠️ Build 스테이지
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build

# 🚀 Production 실행 스테이지
FROM node:18-alpine AS production

RUN npm install -g pnpm && apk add --no-cache curl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json pnpm-lock.yaml ./

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["pnpm", "start"]