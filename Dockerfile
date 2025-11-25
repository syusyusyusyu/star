# 本番用マルチステージ Dockerfile（Viteビルド + Honoサーバー）
FROM node:20-alpine AS base

# 依存関係インストール（ビルド用）
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# アプリビルド
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm run build:server

# ランタイム（本番）
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

# 本番依存のみインストール
COPY package*.json ./
RUN npm ci --omit=dev

# ビルド成果物をコピー
COPY --from=build /app/docs ./docs
COPY --from=build /app/dist-server ./dist-server

# ポート公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# サーバ起動
CMD ["node", "dist-server/index.js"]
