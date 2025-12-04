# Cross Stage (クロステ)

**音楽と一体化する、新感覚リズムアクション。**

TextAlive の歌詞同期技術と MediaPipe の身体認識技術を融合。
流れる歌詞を「目で追い」「手で触れる」ことで、楽曲の世界に没入できる次世代の Web リズムゲームです。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-Server-E36002?logo=hono&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)

---

## ✨ 特徴 (Highlights)

### 🎮 2つの革新的なプレイモード
- **マウスモード (Mouse Mode)**:
  - マウスカーソルで歌詞をキャッチする、直感的で軽快なモード。
  - モバイル端末ではタップ操作に自動最適化。
- **カメラモード (Camera Mode)**:
  - Webカメラを使用し、**全身を使って**歌詞をキャッチ。
  - MediaPipe Pose & Selfie Segmentation による高精度なリアルタイム身体認識。
  - 自分のシルエットがステージ上の光と融合する、圧倒的な没入感。

### 🎨 没入感を高める "Live Venue" UI
- **Cross Stage テーマ**:
  - ダークなライブ会場をイメージした背景と、ミクグリーン (`#39C5BB`) のネオンアクセント。
  - ガラスモーフィズム（すりガラス効果）を取り入れたモダンなインターフェース。
- **リッチな演出**:
  - CSS/SVG を駆使したカスタムファビコン、ローディングアニメーション。
  - 楽曲のビートに合わせて脈打つライトや、観客のシルエット演出。

### 🎵 TextAlive による「生きた」歌詞体験
- **リアルタイム同期**:
  - 楽曲の進行に合わせて歌詞が動的に生成・配置されます。
  - 単なるテキストではなく、楽曲の一部として演出される「リリックアプリ」としての側面。
- **フォールバック機能**:
  - API 制限時やオフライン時でもプレイを継続できる堅牢な設計。

### 🏆 グローバルランキングシステム
- **Supabase 連携**:
  - プレイ結果（スコア、コンボ、ランク）をクラウドデータベースに保存。
  - プレイヤー名登録機能付き。
- **多機能ランキング**:
  - モード別（マウス/カメラ）、期間別（全期間/24時間）のフィルタリングに対応。
  - リアルタイムで更新されるリーダーボードで世界中のプレイヤーと競えます。

### 🛡️ 堅牢でユーザーフレンドリーな設計
- **離脱防止ガード**:
  - 誤って「戻る」ボタンや「リロード」を押しても、確認モーダルが表示されゲーム中断を防ぎます。
- **SPA (Single Page Application)**:
  - Hono サーバーによる SPA フォールバック実装で、どの URL からでも正しくアプリを起動。
  - クライアントサイド・ルーティングによる高速な画面遷移。

---

## 🛠️ 技術スタック (Tech Stack)

| カテゴリ | 技術 | 詳細 |
|---------|------|------|
| **Frontend** | **React 18** | コンポーネントベースの UI 構築 |
| | **Vite** | 高速なビルドツールと HMR |
| | **Tailwind CSS** | ユーティリティファーストなスタイリング |
| **Game Core** | **TextAlive App API** | 歌詞同期・楽曲再生制御 |
| | **MediaPipe** | Pose / Selfie Segmentation (身体認識) |
| | **Canvas API** | 高速な描画処理 |
| **Backend** | **Hono** | 超高速な Web フレームワーク (Node.js adapter) |
| **Database** | **Supabase** | PostgreSQL ベースの BaaS (スコア保存) |
| **Infra** | **Docker** | 開発・本番環境のコンテナ化 |
| | **Cloudflare Workers** | エッジデプロイ対応 (構成ファイルあり) |

---

## 🚀 セットアップ (Getting Started)

### 必要要件
- Node.js 20+
- Web カメラ (カメラモード用)

### ローカル開発
```bash
# 依存関係のインストール
npm install

# 開発サーバー起動 (Frontend: 5173, Backend: 3000)
npm run dev
```
ブラウザで `http://localhost:5173` を開いてください。

### Docker での起動
```bash
# 開発環境
docker compose -f docker-compose.dev.yml up --build

# 本番環境
docker compose up --build -d
```

---

## 🕹️ 操作方法 (How to Play)

1. **タイトル画面**:
   - 「マウスモード」か「カメラモード」を選択します。
   - 「ランキング」ボタンで現在のハイスコアを確認できます。
   - 「遊び方」ボタンで詳細なルールを確認できます。
2. **ゲームプレイ**:
   - 画面外から流れてくる「歌詞バブル」を、カーソルまたは体の動きでキャッチ（接触）します。
   - タイミングよく連続でキャッチすると「コンボ」が繋がり、スコアが伸びます。
3. **リザルト**:
   - 曲が終了すると結果発表。
   - 名前を入力して「ランキングに登録」ボタンを押すと、スコアが保存されます。

---

## 📜 ライセンス & クレジット

This project is licensed under the MIT License.

- **TextAlive App API**: Powered by TextAlive (AIST).
- **Songle**: Powered by Songle (AIST).
- **楽曲**:
  - 加賀(ネギシャワーP)「ストリートライト」
  - 雨良 Amala「アリフレーション」

---

> **Update History (2025 Winter)**:
> - UI/UX の全面刷新 (Tailwind CSS, Glassmorphism)
> - Supabase ランキングシステムの実装
> - 離脱防止ガードの実装
> - SPA ルーティングの最適化
> - カスタム Favicon の導入
```bash
# Supabase 接続情報をシークレットとして登録
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

#### 3. デプロイ
```bash
# 本番デプロイ
npm run deploy

# プレビュー環境へデプロイ
npm run deploy:preview

# ローカルで Workers をテスト
npm run cf:dev
```

#### 構成ファイル
| ファイル | 説明 |
|---------|------|
| `wrangler.jsonc` | Workers 設定（プロジェクト名、静的アセット等） |
| `worker/index.ts` | Workers 用 Hono エントリーポイント |
| `worker/routes/score.ts` | スコア/ランキング API |
| `worker/supabaseClient.ts` | Supabase クライアント（Workers 用） |

#### デプロイ後の URL
デプロイ完了後、以下の形式で公開されます：
```
https://lyric-stage.<your-subdomain>.workers.dev
```

## 遊び方（展示運用の流れ）
1) http://localhost:5173 を開く  
2) モードを選択（初期はマウスモード / 体感デモはカメラモード推奨）  
3) 曲を選んで「Play」を押すと `/game` へ遷移  
4) カメラ許可 → カメラモードは全身検出でカウントダウン開始  
5) 流れてくる歌詞に触れてスコアとコンボを伸ばす  
6) 曲終了でリザルト（スコア・最大コンボ・ランク）を確認  
- フレームアウト警告が出たらカメラに体を戻す  
- TextAlive が使えない環境でも簡易歌詞でプレイ可能
- FPS 計測が必要な場合は `?debug=fps` もしくは `#fps` を URL に付けてオーバーレイを表示

## ディレクトリ案内
```
star-5/
├── src/
│   ├── pages/
│   │   ├── IndexPage.tsx      # タイトル/モード・選曲 UI
│   │   └── GamePage.tsx       # ゲーム画面の React コンテナ
│   ├── game/
│   │   ├── GameManager.ts     # 歌詞同期・判定・入力・演出のコア
│   │   ├── GameLoop.ts        # requestAnimationFrame ループ
│   │   ├── BubblePool.ts      # 歌詞バブル DOM プール
│   │   ├── TimerManager.ts    # タイマー一元管理
│   │   ├── gameLoader.ts      # ゲーム初期化
│   │   ├── events.ts          # イベント定義
│   │   └── types.ts           # 型定義
│   └── components/game/
│       ├── ModeTabs.tsx       # モード切替タブ
│       ├── RankingPanel.tsx   # ランキング表示パネル
│       ├── RankingModal.tsx   # ランキングモーダル
│       └── Slot.tsx           # スロットコンポーネント
├── server/
│   ├── index.ts               # Hono サーバー（静的配信/API）
│   ├── supabaseClient.ts      # Supabase クライアント
│   └── routes/
│       └── score.ts           # スコア/ランキング API
├── worker/                    # Cloudflare Workers 用
│   ├── index.ts               # Workers エントリーポイント
│   ├── supabaseClient.ts      # Supabase クライアント（Workers 用）
│   └── routes/
│       └── score.ts           # スコア/ランキング API
├── docs/                      # ビルド成果物（Hono/Workers が配信）
├── wrangler.jsonc             # Cloudflare Workers 設定
├── docker-compose.yml         # 本番用 Docker Compose
├── docker-compose.dev.yml     # 開発用 Docker Compose
├── Dockerfile                 # 本番用マルチステージビルド
└── Dockerfile.dev             # 開発用 Dockerfile
```

## クラス図（SRP リファクタリング後）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GameManager                                    │
│  (ゲームの中心: 再生制御 / スコア・コンボ管理 / プレーヤー状態保持)              │
├─────────────────────────────────────────────────────────────────────────────┤
│  - player: ExtendedPlayer                                                   │
│  - score, combo, maxCombo                                                   │
│  - lyricsData[]                                                             │
│  - timers: TimerManager                                                     │
│  - gameLoop: GameLoop                                                       │
│  - bubblePool: BubblePool                                                   │
└────────────────┬────────────────────────────────────────────────────────────┘
                 │ 委譲（SRP）
    ┌────────────┴────────────┬────────────┬────────────┬───────────┐
    ▼                         ▼            ▼            ▼           ▼
┌──────────────┐  ┌──────────────────┐ ┌─────────────┐ ┌─────────┐ ┌────────────────┐
│  UIManager   │  │BodyDetectionMgr │ │LyricsRenderer│ │EffectsMgr│ │ ResultsManager │
│ (指示テキスト │  │(全身検出/警告/   │ │(歌詞バブル   │ │(クリック │ │ (リザルト画面   │
│  手検出表示)  │  │ カウントダウン)  │ │ DOM生成)    │ │ 演出)    │ │  表示/ボタン)   │
└──────────────┘  └──────────────────┘ └─────────────┘ └─────────┘ └────────────────┘
                            │
                            ▼
                 ┌────────────────────┐
                 │  InputManager      │
                 │ (マウス/タッチ/    │
                 │  ボタン配線)        │
                 └────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                          LiveStageVisuals                                │
│  (three.js シーン描画 / プレーヤーアバター / ペンライト)                   │
└──────────────────────────────────────────────────────────────────────────┘

┌───────────────┐   ┌───────────────┐   ┌────────────────┐
│   GameLoop    │   │  BubblePool   │   │  TimerManager  │
│ (RAF ループ)  │   │ (DOMプール)   │   │ (setTimeout管理)│
└───────────────┘   └───────────────┘   └────────────────┘

┌───────────────┐
│ViewportManager│
│ (モバイル対応) │
└───────────────┘
```

### 各クラスの責務（単一責任の原則）
| クラス | 責務 |
|--------|------|
| **GameManager** | ゲーム全体の状態管理・再生制御・スコア計算 |
| **UIManager** | 指示テキストや手検出インジケーターの更新 |
| **BodyDetectionManager** | 全身検出の評価・カウントダウン・警告表示 |
| **LyricsRenderer** | 歌詞バブル DOM の生成・スタイル・配置 |
| **EffectsManager** | クリック/ヒット時のパーティクル演出 |
| **ResultsManager** | リザルト画面の表示・ボタン配線 |
| **InputManager** | マウス/タッチ/ボタンのイベント配線 |
| **ViewportManager** | モバイルビューポート高さの CSS 変数設定 |
| **LiveStageVisuals** | three.js の 3D シーン描画・アバター更新 |
| **GameLoop** | requestAnimationFrame ループの抽象化 |
| **BubblePool** | 歌詞バブル DOM 要素のオブジェクトプール |
| **TimerManager** | setTimeout/setInterval の一元管理 |

## 展示時の Tips
- カメラ許可とネットワーク疎通を事前確認（TextAlive API が外部に出られるか）
- 体全体が映る距離を確保し、背景がごちゃつく場合は Selfie Segmentation が誤検出しやすいので照明を明るく
- ブラウザ全画面（F11）で観客向けに見せると演出が映えます

## ランキング / Supabase セットアップ

### 1. Supabase プロジェクト作成
1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. `supabase_scores.sql` の SQL を SQL Editor で実行してテーブル作成（`player_name` カラム含む）

### 2. 環境変数設定
`.env` ファイルを作成：
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...
```
> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用。フロントに公開禁止。

### 3. API 仕様
| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/score` | POST | スコア保存（プレイヤー名対応） |
| `/api/ranking` | GET | ランキング取得（Top10、フィルタ対応） |

#### スコア保存リクエスト
```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"songId":"HmfsoBVch26BmLCm","mode":"cursor","score":12345,"maxCombo":99,"rank":"A","playerName":"Miku"}'
```

#### ランキング取得
```bash
# 全期間・全モード
curl "http://localhost:3000/api/ranking?songId=HmfsoBVch26BmLCm"

# 週間・マウスモード
curl "http://localhost:3000/api/ranking?songId=HmfsoBVch26BmLCm&mode=cursor&period=weekly"
```

## セキュリティ対策

### サーバーサイド
| 対策 | 説明 |
|------|------|
| レート制限 | IP ベースで 1 分間に 30 リクエストまで（DoS 対策） |
| 入力バリデーション | songId/score/maxCombo/rank/mode を厳密に検証 |
| パラメータ化クエリ | Supabase クライアントによる自動エスケープ |

#### バリデーションルール
| フィールド | ルール |
|-----------|--------|
| `songId` | 英数字・ハイフン・アンダースコアのみ、最大 64 文字 |
| `score` | 0〜1,000,000 の範囲 |
| `maxCombo` | 0〜10,000 の整数 |
| `rank` | SS/S/A/B/C/D/F のいずれか |
| `mode` | cursor/body のいずれか |
| `playerName` | 最大 20 文字（未入力時は 'ゲスト'） |

### HTTP セキュリティヘッダー
| ヘッダー | 目的 |
|---------|------|
| `Content-Security-Policy` | XSS 対策、許可ドメインを限定 |
| `X-Frame-Options: SAMEORIGIN` | クリックジャッキング対策 |
| `X-Content-Type-Options: nosniff` | MIME スニッフィング対策 |
| `Strict-Transport-Security` | HTTPS 強制（本番環境） |
| `Referrer-Policy` | リファラー情報の制限 |
| `Permissions-Policy` | カメラ以外の機能を制限 |

## ライセンス
MIT License

## 貢献
Issue や Pull Request は歓迎します。
