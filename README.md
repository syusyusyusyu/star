# Lyric Stage - React × Hono 版

Webカメラ × 歌詞同期 × 3Dステージで歌詞バブルに触れて遊ぶリズムインタラクティブゲーム

## プロジェクト構成

このプロジェクトは **React × Hono** 構成に移行されました：

- **フロントエンド**: React + Vite + Tailwind CSS
- **バックエンド**: Hono (軽量Node.jsサーバー)
- **ゲームロジック**: 既存のGameManager（Three.js, MediaPipe, TextAlive）をそのまま使用

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバーの起動

開発環境では、ViteとHonoサーバーを同時に起動します：

```bash
npm run dev
```

これにより以下が起動します：
- Vite開発サーバー: `http://localhost:5173`
- Honoバックエンド: `http://localhost:3000`

ブラウザで `http://localhost:5173` にアクセスしてください。

### 3. 本番ビルド

```bash
npm run build
```

ビルドされたファイルは `docs/` フォルダに出力されます。

本番サーバーを起動：

```bash
npm start
```

`http://localhost:3000` でアプリケーションが利用できます。

## プロジェクト構造

```
star-5/
├── src/
│   ├── components/       # Reactコンポーネント
│   ├── pages/            # ページコンポーネント
│   │   ├── IndexPage.jsx # トップページ
│   │   └── GamePage.jsx  # ゲームページ
│   ├── data/
│   │   └── songs.js      # 楽曲データ
│   ├── styles/           # CSSファイル
│   │   ├── index.css     # インデックスページ用
│   │   └── game.css      # ゲームページ用
│   ├── App.jsx           # ルーティング設定
│   ├── main.jsx          # エントリーポイント
│   └── index.css         # グローバルCSS
├── public/
│   └── script.js         # ゲームロジック（GameManager）
├── docs/                 # ビルド出力（本番用静的ファイル）
├── server.js             # Honoサーバー
├── vite.config.js        # Vite設定
├── tailwind.config.js    # Tailwind設定
└── package.json          # 依存関係とスクリプト

```

## 主な変更点

### システム構成
- ✅ React + Vite によるモダンなフロントエンド構成
- ✅ Hono による軽量バックエンドサーバー
- ✅ Tailwind CSS による スタイリング
- ✅ React Router によるSPAルーティング

### 維持された機能
- ✅ すべてのゲームシステム（GameManager）
- ✅ すべてのデザインとUI
- ✅ Three.js によるる3Dステージ
- ✅ MediaPipe による身体認識（Hand/Body モード）
- ✅ TextAlive による歌詞同期
- ✅ すべてのゲーム機能とエフェクト

## 利用可能なスクリプト

- `npm run dev` - 開発サーバーを起動（Vite + Hono同時起動）
- `npm run server:dev` - Honoサーバーのみ起動
- `npm run client:dev` - Viteのみ起動
- `npm run build` - 本番用ビルド
- `npm start` - 本番サーバーを起動
- `npm run preview` - ビルド後のプレビュー

## 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **Vite 5** - 高速ビルドツール
- **React Router 6** - ルーティング
- **Tailwind CSS 3** - CSSフレームワーク

### バックエンド
- **Hono 4** - 軽量Webフレームワーク
- **@hono/node-server** - Node.jsアダプター

### ゲーム関連
- **Three.js** - 3Dグラフィックス
- **MediaPipe** - 姿勢・手認識
- **TextAlive** - 歌詞同期API

## ブラウザ対応

- Chrome/Edge (推奨)
- Firefox
- Safari
- モバイルブラウザ（カーソルモードのみ）

## 注意事項

- カメラアクセスにはHTTPS接続が必要です（開発環境を除く）
- MediaPipe機能（Hand/Bodyモード）はPC推奨
- モバイルデバイスではCursorモードに自動制限されます

## ライセンス

このプロジェクトは個人利用・学習目的です。

## 作者

**Lyric Stage チーム**
