# Lyric Stage - React + Hono

TextAlive で同期した歌詞バブルと three.js ステージで遊ぶリズムゲーム。カーソル / ハンド / ボディの3モードで歌詞に触れてスコアを稼ぎます。Hono が静的配信と最小 API を担います。

## できること
- 歌詞同期とバブル: TextAlive から歌詞とタイミングを取得し、バブルを生成・移動。利用不可時は簡易フォールバック歌詞を生成。
- 3D ステージ: three.js でライブ風ステージを描画し、バブルの流れ・スコア・カメラを `script.js` が管理。
- 入力モード: Cursor（マウス/タッチ）、Hand（MediaPipe Hands）、Body（MediaPipe Pose + Selfie Segmentation）。全身検出でカウントダウン開始し、3秒外れると警告表示。
- 判定安定化: 歌詞を NFC 正規化し、500ms の表示ウィンドウで判定。左上 viewer 歌詞はデフォルト無効化し、プレイ用バブルに集中。
- サーバー: Hono で `index.html`/`game.html` を配信し、`/api/health` と `/api/echo` を提供。CORS/Logger/Powered-By を適用し、スコア保存などへの拡張余地あり。

## セットアップ
### Docker（推奨）
- Windows: `start-dev.bat`
- Mac/Linux/WSL: `./start-dev.sh`

Vite（5173）と Hono（3000）が起動します。ブラウザで `http://localhost:5173`（同梱 UI）または `http://localhost:3000/game.html` にアクセス。

### ローカル開発
```bash
npm install
npm run dev
```
`npm run dev` は Vite と Hono を同時に起動します。フロント: `http://localhost:5173`、サーバー/API: `http://localhost:3000/`。

### ビルド / 起動
```bash
npm run build
npm start
```
ビルドしたフロントエンドと静的ファイルを Hono（`server/index.ts`）で配信します。

## ディレクトリ構成
- `src/` React + Tailwind UI（タイトル/選曲など）
- `public/` ゲーム本体 (`game.html`, `script.js`, `styles.css`, `game-loader.js`)
- `server/` Hono サーバー実装（静的配信 + `/api/health`, `/api/echo`）
- `docs/` ビルド成果物（存在すればここから静的配信）
- `gemini.md` 仕様詳細

## 遊び方の概要
1. ローカル HTTP サーバー経由で `index.html` を開く。
2. Cursor / Hand / Body からプレイモードを選び、楽曲を選択して開始。
3. 流れる歌詞バブルをモードに応じて触れてスコアとコンボを伸ばす。
4. 楽曲終了後にリザルト（スコア & ランク）を表示。

- カメラ利用にはサーバー経由の配信が必須（`file://` 直開きは不可）。
- MediaPipe や TextAlive に問題がある場合はフォールバック歌詞モードで簡易プレイ可能。
