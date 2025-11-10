# 🐳 Docker 使用ガイド

## クイックスタート

### 開発環境

```bash
# Windows
start-dev.bat

# Mac/Linux/WSL
./start-dev.sh
```

アクセス: http://localhost:5173

### 本番環境

```bash
# Windows
start-prod.bat

# Mac/Linux/WSL
./start-prod.sh
```

アクセス: http://localhost:3000

## Docker設定

### .gitignoreに含まれるDocker除外項目

開発時に生成されるDocker関連ファイルは自動的にGitから除外されます：

```
# Docker volumes & data
.docker/
docker-volumes/
.docker-data/

# Docker Compose overrides (個人設定)
docker-compose.override.yml
docker-compose.*.local.yml

# Docker logs
docker-logs.txt
docker-*.log

# Docker environment files
.env.docker
.env.docker.local

# Container logs
containers/
container-logs/
```

**個人設定の例** (docker-compose.override.yml):
```yaml
services:
  dev:
    ports:
      - "5174:5173"  # 別ポート使用
    environment:
      - DEBUG=true
```

## トラブルシューティング

### ポートが既に使用されている場合

他のプロセスがポート5173や3000を使用している場合、`docker-compose.dev.yml`のポート設定を変更してください：

```yaml
ports:
  - "5174:5173"  # 左側を変更
  - "3001:3000"  # 左側を変更
```

### node_modulesの問題

Windowsでnode_modulesに問題がある場合：

```bash
# ボリュームを削除して再作成
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

### ホットリロードが動作しない場合

WSL2を使用している場合、Dockerの設定で「Use WSL 2 based engine」が有効になっているか確認してください。

### "Failed to load module script" エラー

完全なトラブルシューティングガイドは [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) を参照してください。

## よくあるコマンド

```bash
# 再ビルド
docker-compose -f docker-compose.dev.yml build --no-cache

# コンテナに入る
docker exec -it star-5-dev sh

# ログ確認
docker-compose -f docker-compose.dev.yml logs -f

# 完全削除
docker-compose -f docker-compose.dev.yml down -v

# イメージクリーンアップ
docker image prune -a
```

## トラブルシューティング

### ポート競合
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID [PID] /F

# Mac/Linux
lsof -i :5173
kill -9 [PID]
```

### ビルドエラー
```bash
# キャッシュクリアして再ビルド
docker-compose -f docker-compose.dev.yml down -v
docker system prune -a
docker-compose -f docker-compose.dev.yml up --build
```

### モジュール読み込みエラー

詳細は [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) を参照。
