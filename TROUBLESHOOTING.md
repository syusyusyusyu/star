# 🔧 トラブルシューティング

## Docker関連

### "Failed to load module script" エラー

**原因:** Viteサーバーが正しく起動していない

**解決方法:**
```bash
# 完全クリーン
docker-compose -f docker-compose.dev.yml down -v
docker system prune -a -f

# 再ビルド
docker-compose -f docker-compose.dev.yml up --build
```

### ポート競合

**Windows:**
```bash
netstat -ano | findstr :5173
taskkill /PID [PID] /F
```

**Mac/Linux:**
```bash
lsof -i :5173
kill -9 [PID]
```

### ホットリロードが動作しない

1. WSL2を使用（Windows）
2. `vite.config.ts`に`usePolling: true`が設定されているか確認
3. コンテナを再起動

### node_modules エラー

```bash
# 完全削除して再ビルド
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

## ゲーム関連

### 歌詞が表示されない

1. TextAlive APIトークンが正しいか確認
2. ブラウザのコンソールでエラーを確認
3. `public/script.js`のログを確認

### ボディ/フェイスモードで動作しない

1. カメラのアクセス許可を確認
2. ボディ：全身が画面に映っているか確認
3. フェイス：顔がはっきりと映っているか確認（逆光に注意）
4. 照明が十分か確認

### 曲が終わってもリザルトが表示されない

最新版では修正済み。`git pull`して最新版を取得してください。

## その他

### パーミッションエラー（Linux/Mac）

```bash
sudo chown -R $USER:$USER .
chmod +x start-dev.sh start-prod.sh
```

### ビルドエラー

```bash
# Dockerストレージをクリア
docker system prune -a
docker volume prune

# 再ビルド
docker-compose -f docker-compose.dev.yml build --no-cache
```

## デバッグ方法

### ログ確認

```bash
docker-compose -f docker-compose.dev.yml logs -f
docker exec -it star-5-dev sh
```

## デバッグコマンド

```bash
# ログ確認
docker-compose -f docker-compose.dev.yml logs -f

# コンテナ内に入る
docker exec -it star-5-dev sh

# ポート確認
docker port star-5-dev

# 環境情報
docker version
node --version
```

## パフォーマンス最適化

**Windowsの場合**: WSL2を使用し、プロジェクトをWSL内に配置

```bash
wsl
cd ~
git clone [your-repo]
cd star-5
./start-dev.sh
```

### Mac/Linuxの場合

1. **Dockerリソースを増やす**
   - Docker Desktop > Settings > Resources
   - CPU: 4コア以上
   - Memory: 4GB以上

2. **delegated/cachedモードを使用**
   ```yaml
   volumes:
     - ./src:/app/src:delegated
   ```

## サポート

問題が解決しない場合は、以下の情報とともにIssueを作成してください：

```bash
# システム情報を収集
docker version
docker-compose version
node --version
npm --version

# ログを保存
docker-compose -f docker-compose.dev.yml logs > docker-logs.txt
```
