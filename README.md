# Cross Stage

TextAlive の歌詞同期と MediaPipe のカメラ入力を組み合わせ、three.js のライブステージに流れる歌詞バブルへ「触れて」スコアを稼ぐ Web リズムゲームです。学内作品展ですぐ動かせるよう、仕様と手順を具体的にまとめました。

> **2025 年冬アップデート**: 独立 GameLoop / BubblePool / TimerManager、three.js ジオメトリ共有、手/歌詞バブルのプール化、MediaPipe cadence 最適化、ランキングモーダル分離、サーバー側ランキングキャッシュ、FPS オーバーレイ（`?debug=fps` または `#fps`）などパフォーマンス改善を多数実装しました。

> **2025 年冬 SRP リファクタリング**: GameManager を単一責任の原則（SRP）に沿って分割し、UI/入力/演出/ボディ検出/歌詞レンダリング/リザルト表示を専任クラスに委譲しました。

> **2025 年 12 月**: Supabase 連携によるスコア保存・ランキング機能、セキュリティ強化（CSP / レート制限 / 入力バリデーション）、RankingModal コンポーネント追加。

## 作品概要
- 歌詞同期バブル: TextAlive App API で取得した歌詞をタイミング通りにバブル化し、ヒットでスコア/コンボ加算
- 2 つのプレイモード: `マウスモード`（マウス/タップ）と `カメラモード`（MediaPipe Pose + Selfie Segmentation で全身入力）
- 3D ライブ演出: three.js でステージ/ライト/粒子を描画し、身体シルエットを合成
- 判定とリザルト: NFC 正規化した歌詞で判定の揺らぎを抑制し、曲終了後にスコア・最大コンボ・ランクを表示
- フォールバック再生: TextAlive が使えない場合でも簡易歌詞データでプレイ可能
- パフォーマンス: DOM/three.js/MediaPipe を分離する GameManager リファクタ、オブジェクトプール、計測用 FPS オーバーレイ

## 主な仕様
- モード仕様
  - マウスモード: クリック/タップで歌詞をヒット。モバイルではこのモードに固定
  - カメラモード: 全身が検出されると 5 秒カウントダウン後に開始。3 秒以上フレームアウトすると警告
  - 手のランドマークは MediaPipe Hands で補助検出し、当たり判定の精度を底上げ
- 画面構成
  - タイトル/選曲 (`/`): モード選択と楽曲リスト（星空・ステージ演出付き）
  - ゲーム画面 (`/game`): 歌詞バブル、スコア/コンボ、カウントダウン・ポーズ・リザルト
- 収録曲（TextAlive API トークン同梱）
  - 加賀(ネギシャワーP)「ストリートライト」 (`HmfsoBVch26BmLCm`, https://piapro.jp/t/ULcJ/20250205120202)
  - 雨良 Amala「アリフレーション」 (`rdja5JxMEtcYmyKP`, https://piapro.jp/t/SuQO/20250127235813)
- サーバー API:
  - `GET /api/health` : 疎通確認
  - `POST /api/echo` : デバッグ用
  - `POST /api/score` : スコア保存（Supabase 連携）
  - `GET /api/ranking?songId=...&mode=cursor|body` : ランキング取得（30 秒 TTL キャッシュ）

## 技術スタック
| カテゴリ | 技術 |
|---------|------|
| **フロント** | React 18 + TypeScript / Vite、Tailwind CSS |
| **ゲームコア** | three.js、TextAlive App API、MediaPipe Pose/Hands/Selfie Segmentation |
| **サーバー** | Hono + @hono/node-server（CORS/Logger/CSP ヘッダー） |
| **データベース** | Supabase（PostgreSQL）- スコア/ランキング保存 |
| **開発ツール** | tsx、concurrently、Docker（dev/prod）、Node.js 20 系 |
| **セキュリティ** | CSP / レート制限 / 入力バリデーション / パラメータ化クエリ |

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
| 環境 | Windows | Mac/Linux/WSL | 構成ファイル | ポート |
|------|---------|---------------|--------------|--------|
| 開発 | `start-dev.bat` | `./start-dev.sh` | `docker-compose.dev.yml` | 5173/3000 |
| 本番 | `start-prod.bat` | `./start-prod.sh` | `docker-compose.yml` | 3000 |

#### Docker コマンド例
```bash
# 開発環境（ホットリロード対応）
docker compose -f docker-compose.dev.yml up --build

# 本番環境（マルチステージビルド）
docker compose up --build -d
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
├── docs/                      # ビルド成果物（Hono が優先配信）
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
2. `supabase_scores.sql` の SQL を SQL Editor で実行してテーブル作成

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
| `/api/score` | POST | スコア保存 |
| `/api/ranking` | GET | ランキング取得（Top10） |

#### スコア保存リクエスト
```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"songId":"HmfsoBVch26BmLCm","mode":"cursor","score":12345,"maxCombo":99,"rank":"A"}'
```

#### ランキング取得
```bash
curl "http://localhost:3000/api/ranking?songId=HmfsoBVch26BmLCm&mode=cursor"
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
