# パフォーマンス改善ガイド

## エディタが重い場合

### 1. VSCode設定を確認
`.vscode/settings.json`で以下を設定済み：
- ファイル監視除外（node_modules, dist, docker-volumes等）
- 検索除外設定
- Git自動フェッチ無効化

### 2. 不要なファイルを削除

```bash
# ビルドキャッシュをクリア
rm -rf dist docs/assets node_modules/.vite

# Dockerキャッシュをクリア
docker system prune -f
docker builder prune -f
```

### 3. node_modules再インストール

```bash
rm -rf node_modules package-lock.json
npm install
```

## Docker起動が重い場合

### 開発モードを使用

```bash
# 本番モード（重い）
./start-prod.sh

# 開発モード（軽い）
./start-dev.sh
```

### リソース制限を追加

`docker-compose.dev.yml`に追加：
```yaml
services:
  dev:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## Windows WSL2の場合

### .wslconfigを設定

`C:\Users\[ユーザー名]\.wslconfig`を作成：
```ini
[wsl2]
memory=4GB
processors=2
swap=1GB
```

設定後、WSL再起動：
```bash
wsl --shutdown
```

## 推奨事項

1. **不要な拡張機能を無効化** - VSCodeの拡張機能を確認
2. **ファイル監視を最小化** - `.vscode/settings.json`で除外設定
3. **開発モードを使用** - 本番ビルドは重いため開発時は避ける
4. **定期的なキャッシュクリア** - `npm cache clean --force`
