# Lyric Stage - React × Hono 構成

初音ミクの楽曲に合わせて歌詞をタッチするリズムゲーム。カーソル、ハンド、ボディの3つのモードで楽しめます。

## 🚀 クイックスタート

### Docker で起動（推奨）

**Windows:**
```bash
start-dev.bat
```

**Mac/Linux/WSL:**
```bash
./start-dev.sh
```

起動後: http://localhost:5173

### ローカル環境

```bash
npm install
npm run dev
```

## 📚 ドキュメント

- **[DOCKER.md](./DOCKER.md)** - Docker使用方法とトラブルシューティング
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - エラー解決ガイド
- **[gemini.md](./gemini.md)** - ゲーム仕様詳細

## 🎮 ゲームモード

- **Cursor**: マウスやタッチで歌詞をクリック
- **Hand**: Webカメラで手の動きを検出
- **Body**: 全身の動きを検出（要カメラ）

## 🛠️ 技術スタック

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Hono (Node.js)
- **Game**: TextAlive API + MediaPipe
- **Deploy**: Docker対応

## 📁 プロジェクト構造

```
src/          # Reactアプリ
public/       # ゲームロジック（game.html, script.js）
server/       # Honoサーバー
docs/         # ビルド成果物
```

## ⚙️ 設定ファイル

プロジェクトには開発環境を統一するための設定ファイルが含まれています：

- `.gitignore` - Git除外設定（220+項目）
- `.gitattributes` - 改行コード統一
- `.dockerignore` - Dockerビルド最適化
- `.editorconfig` - エディター設定統一
- `.npmrc` - NPM設定
