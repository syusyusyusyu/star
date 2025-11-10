# マルチステージビルドを使用した本番環境用Dockerfile
FROM node:20-alpine AS base

# 依存関係のインストール用ステージ
FROM base AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ビルド用ステージ
FROM base AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# クライアントとサーバーの両方をビルド
RUN npm run build
RUN npm run build:server

# 本番環境用ステージ
FROM base AS production
WORKDIR /app

# 本番環境に必要なパッケージのみインストール
COPY package*.json ./
RUN npm ci --only=production

# ビルド成果物をコピー
COPY --from=build /app/docs ./docs
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/public ./public

# ポート3000を公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 本番サーバーを起動
CMD ["node", "dist-server/index.js"]
