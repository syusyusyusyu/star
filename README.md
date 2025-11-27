# Cross Stage 

TextAlive の歌詞同期と MediaPipe のカメラ入力を組み合わせ、three.js のライブステージに流れる歌詞バブルへ「触れて」スコアを稼ぐ Web リズムゲームです。学内作品展ですぐ動かせるよう、仕様と手順を具体的にまとめました。

## 作品概要
- 歌詞同期バブル: TextAlive App API で取得した歌詞をタイミング通りにバブル化し、ヒットでスコア/コンボ加算
- 2 つのプレイモード: `Cursor`（マウス/タップ）と `Body`（MediaPipe Pose + Selfie Segmentation で全身入力）
- 3D ライブ演出: three.js でステージ/ライト/粒子を描画し、身体シルエットを合成
- 判定とリザルト: NFC 正規化した歌詞で判定の揺らぎを抑制し、曲終了後にスコア・最大コンボ・ランクを表示
- フォールバック再生: TextAlive が使えない場合でも簡易歌詞データでプレイ可能

## 主な仕様
- モード仕様
  - Cursor: クリック/タップで歌詞をヒット。モバイルではこのモードに固定
  - Body: 全身が検出されると 5 秒カウントダウン後に開始。3 秒以上フレームアウトすると警告
  - 手のランドマークは MediaPipe Hands で補助検出し、当たり判定の精度を底上げ
- 画面構成
  - タイトル/選曲 (`/`): モード選択と楽曲リスト（星空・ステージ演出付き）
  - ゲーム画面 (`/game`): 歌詞バブル、スコア/コンボ、カウントダウン・ポーズ・リザルト
- 収録曲（TextAlive API トークン同梱）
  - 加賀(ネギシャワーP)「ストリートライト」 (`HmfsoBVch26BmLCm`, https://piapro.jp/t/ULcJ/20250205120202)
  - 雨良 Amala「アリフレーション」 (`rdja5JxMEtcYmyKP`, https://piapro.jp/t/SuQO/20250127235813)
- サーバー API: `GET /api/health` で疎通確認、`POST /api/echo` はデバッグ用

## 技術スタック
- フロント: React 18 + TypeScript / Vite、Tailwind CSS（index-styles.css でカスタム演出）
- ゲームコア: three.js、TextAlive App API、MediaPipe Pose/Hands/Selfie Segmentation、独自 GameManager (`src/game/GameManager.ts`)
- サーバー: Hono + @hono/node-server（CORS/Logger/Powered-By、静的配信、将来のスコア保存に拡張可）
- 開発ツール: tsx、concurrently、Docker（dev/prod）、Node.js 20 系

## セットアップ
### 必要なもの
- Node.js 20+ と npm
- Web カメラ付き PC（Chrome/Edge 推奨）
- インターネット接続（TextAlive と CDN 読み込みのため）

### ローカル開発（作品展デモに推奨）
```bash
npm install
npm run dev    # Vite:5173 + Hono:3000 を同時起動
```
- ブラウザで http://localhost:5173 を開き、カメラ使用を許可
- ゲーム API は http://localhost:3000 で待ち受け（health/echo のみ）

### 本番ビルド
```bash
npm run build          # フロントビルド
npm run build:server   # Hono サーバーのトランスパイル
npm start              # dist-server/index.js を起動（デフォルト :3000）
```
- `docs/` が存在すればそこから静的配信、なければリポジトリルート配信

### Docker で動かす場合
- 開発: Windows は `start-dev.bat`、Mac/Linux/WSL は `./start-dev.sh`（`docker-compose.dev.yml` で 5173/3000 を公開）
- 本番: Windows は `start-prod.bat`、Mac/Linux/WSL は `./start-prod.sh`（`docker-compose.yml` で 3000 を公開）

## 遊び方（展示運用の流れ）
1) http://localhost:5173 を開く  
2) モードを選択（初期は Cursor / 体感デモは Body 推奨）  
3) 曲を選んで「Play」を押すと `/game` へ遷移  
4) カメラ許可 → Body モードは全身検出でカウントダウン開始  
5) 流れてくる歌詞に触れてスコアとコンボを伸ばす  
6) 曲終了でリザルト（スコア・最大コンボ・ランク）を確認  
- フレームアウト警告が出たらカメラに体を戻す  
- TextAlive が使えない環境でも簡易歌詞でプレイ可能

## ディレクトリ案内
- `src/pages/IndexPage.tsx` …… タイトル/モード・選曲 UI
- `src/pages/GamePage.tsx` …… ゲーム画面の React コンテナ
- `src/game/GameManager.ts` …… 歌詞同期・判定・入力・演出のコア
- `server/index.ts` …… Hono サーバー（静的配信と簡易 API）
- `docs/` …… ビルド成果物を置くと Hono が優先して配信

## 展示時の Tips
- カメラ許可とネットワーク疎通を事前確認（TextAlive API が外部に出られるか）
- 体全体が映る距離を確保し、背景がごちゃつく場合は Selfie Segmentation が誤検出しやすいので照明を明るく
- ブラウザ全画面（F11）で観客向けに見せると演出が映えます

