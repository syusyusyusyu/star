# クロステ ～Cross Stage～

**音楽と身体が交差するWebリズムゲーム**

Cross Stage は、TextAlive App API による歌詞同期技術と MediaPipe (Pose / FaceMesh) による動作検知AIを融合させた、Webリズムゲームです。
ライブステージを舞台に、流れてくる歌詞を「掴み」「奏でる」ような体験を提供します。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-Workers-E36002?logo=hono&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)

---

## 🎮 ゲーム概要

プレイヤーはライブステージの観客、あるいは演者となり、楽曲に合わせて流れてくる「歌詞」をタイミングよく操作します。単なるタップではなく、**「ホールド（長押し）」**することでゲージを溜め、スコアを稼ぐ独自のリズムアクションを採用しています。
プレイ結果はオンラインランキングに登録されます。

### Immersive Live Experience
- **ネオン×グラスモーフィズム**: ネオンライトと透き通るようなUIデザイン。
- **3Dステージ演出**: Three.js と CSS Animation を組み合わせた、軽量なライティング演出。
- **レスポンシブデザイン**: PCの大画面からスマートフォンプレイまで、デバイスに対応したUI。

---

## 🕹️ プレイモード

デバイスや環境に合わせて、4つの操作モードを搭載しています。

| モード | 対象デバイス | 操作方法 | 特徴 |
| :--- | :--- | :--- | :--- |
| **Cursor Mode** | PC / タブレット | マウス / タッチ | マウスカーソルやタッチ操作で歌詞をホールド。手軽に楽しめる基本モード。 |
| **Mobile Mode** | スマートフォン | タップ & ホールド | スマホ操作に特化。画面下部の歌詞表示を排除し、プレイ領域を最大化。親指一つで遊べる直感的な操作感。 |
| **Body Mode** | PC (Webカメラ) | 全身アクション | Webカメラでプレイヤーの動きを検知。手や体を歌詞に重ねて「触れる」ことで入力する、全身を使ったモード。 |
| **Face Mode** | スマートフォン / PC (カメラ付) | 顔移動 & 口パク | カメラで顔を認識。顔を動かして位置を合わせ、口を「パクッ」と開けることで歌詞をキャッチするモード。 |

---

## 🚀 技術的な特徴

### Frontend (Modern Web)
- **React 18 & Vite**: 高速なレンダリングと開発体験。
- **Architecture**: `GameManager` を中心とした厳格な責務分離（SRP）。ゲームループ、入力処理、描画、音声同期を独立管理。
- **Performance**: パーティクルやバブルの描画に `will-change` 最適化やオブジェクトプーリングを採用し、Webブラウザ上で滑らかな60fps動作を実現。

### Backend (Robust & Secure)
- **Cloudflare Workers & Hono**: エッジでの高速なAPI処理。
- **Supabase (PostgreSQL)**: RLS (Row Level Security) を活用した堅牢なデータ管理。
- **Security First**:
  - **Turnstile**: CloudflareのスマートCAPTCHAによるボット排除。
  - **HMAC署名**: スコア送信時の改ざん防止。
  - **Idempotency**: 冪等性を担保し、ネットワーク不安定時の二重投稿を防止。

---

## 🛠️ システム仕様詳細

### 1. システム構成図

```mermaid
classDiagram
  class App
  class IndexPage
  class GamePage
  class RankingModal
  class RankingPanel
  class ModeTabs
  class Slot

  class GameManager {
    +playMusic()
    +togglePlay()
    +restartGame()
    +showResults()
  }
  class GameLoop {
    +start()
    +stop()
  }
  class TimerManager {
    +setTimeout()
    +setInterval()
    +clearTimer()
    +clearAll()
  }
  class BubblePool {
    +acquire()
    +release()
    +releaseAll()
  }
  class LyricsRenderer
  class InputManager {
    +setupEvents()
  }
  class UIManager {
    +updateInstructions()
  }
  class EffectsManager {
    +createClickEffect()
  }
  class ResultsManager {
    +showResults()
  }
  class FaceDetectionManager {
    +init()
  }
  class BodyDetectionManager {
    +isReady()
    +isCountdownActive()
  }
  class ViewportManager {
    +updateViewportHeight()
  }
  class LiveStageVisuals

  class WorkerIndexApp
  class WorkerScoreRoute
  class WorkerAdminRoute
  class RequestIdMiddleware
  class SessionMiddleware
  class AdminAuthMiddleware
  class RateLimiter
  class WorkerSupabaseClient

  class ServerIndexApp
  class ServerScoreRoute
  class ServerSupabaseClient

  App --> IndexPage : route
  App --> GamePage : route
  GamePage --> GameManager : owns
  GamePage --> RankingModal : uses
  GamePage --> RankingPanel : uses
  GamePage --> ModeTabs : uses
  GamePage --> Slot : uses
  RankingModal --> RankingPanel : contains

  GameManager --> GameLoop : frame loop
  GameManager --> TimerManager : timeouts/intervals
  GameManager --> BubblePool : lyric bubble reuse
  GameManager --> LyricsRenderer : spawn/animate lyrics
  GameManager --> InputManager : pointer/gesture
  GameManager --> UIManager : HUD updates
  GameManager --> EffectsManager : particles
  GameManager --> ResultsManager : result flow
  GameManager --> ViewportManager : resize
  GameManager --> FaceDetectionManager : face mode
  GameManager --> BodyDetectionManager : body mode
  GameManager --> LiveStageVisuals : 3D stage
  GameManager ..> WorkerIndexApp : HTTP /api/*
  GameManager ..> ServerIndexApp : HTTP /api/* (dev)
  BodyDetectionManager --> TimerManager : countdown timers

  WorkerIndexApp --> WorkerScoreRoute : /api/score
  WorkerIndexApp --> WorkerAdminRoute : /admin/scores
  WorkerIndexApp --> RequestIdMiddleware : requestId
  WorkerIndexApp --> SessionMiddleware : sessionId
  WorkerAdminRoute --> AdminAuthMiddleware : adminAuth
  WorkerScoreRoute --> RateLimiter : IP/nonce
  WorkerScoreRoute --> WorkerSupabaseClient : insert scores
  WorkerAdminRoute --> WorkerSupabaseClient : delete scores
  WorkerIndexApp --> WorkerSupabaseClient : client init

  ServerIndexApp --> ServerScoreRoute : /api/*
  ServerScoreRoute --> ServerSupabaseClient : insert/query
```

### 2. 機能階層図
```mermaid
graph TD
  A[Cross Stage]
  A --> B[ゲームプレイ]
  B --> B1[モード管理: cursor/body/mobile/face]
  B --> B2[歌詞同期/TextAlive]
  B --> B3[判定/スコア/コンボ]
  B --> B4[ホールドスコア]
  B --> B5[結果/リザルト]
  A --> C[カメラ/入力]
  C --> C1[Pose検出]
  C --> C2[Face検出]
  C --> C3[人物抽出]
  C --> C4[警告/補助UI]
  A --> D[UI/演出]
  D --> D1[歌詞バブル]
  D --> D2[スコア/コンボHUD]
  D --> D3[パーティクル/3D演出]
  A --> E[ランキング]
  E --> E1[スコア登録]
  E --> E2[ランキング取得]
  E --> E3[ランキングUI]
  A --> F[バックエンド]
  F --> F1[API/検証]
  F --> F2[レート制限]
  F --> F3[管理API]
  A --> G[データストア]
  G --> G1[(scores)]
```

### 3. 主要機能の処理フロー (IPO図)
```mermaid
flowchart TB
  subgraph Gameplay[ゲームプレイ/スコアリング]
    GP_In[Input: TextAliveタイミング, プレイヤー入力, カメラLandmarks]
    GP_Proc[Process: バブル生成, ヒット/ホールド判定, コンボ/スコア計算]
    GP_Out[Output: スコアUI, 演出, リザルト]
    GP_In --> GP_Proc --> GP_Out
  end

  subgraph Camera[カメラ認識]
    C_In[Input: Webカメラ映像]
    C_Proc[Process: Pose/FaceMesh/Segmentation, 品質/負荷制御]
    C_Out[Output: ランドマーク/人体マスク/判定イベント]
    C_In --> C_Proc --> C_Out
  end

  subgraph ScoreSubmit[スコア登録]
    S_In[Input: GameResult, x-score-token?, turnstileToken?]
    S_Proc[Process: Origin/Rate limit/HMAC/Turnstile検証, Supabase挿入]
    S_Out[Output: 保存結果/エラー]
    S_In --> S_Proc --> S_Out
  end
```

### 4. 画面遷移図
```mermaid
stateDiagram-v2
  state "タイトル/曲選択" as Index
  state "ゲーム" as Game
  state "リザルト" as Results
  state "ランキング(モーダル)" as Ranking
  state "終了確認(モーダル)" as ExitConfirm

  [*] --> Index
  Index --> Game: ゲームスタート
  Index --> Ranking: ランキング表示
  Ranking --> Index: 閉じる
  Game --> Results: 曲終了/強制終了
  Results --> Game: もう一度
  Results --> Index: タイトルへ
  Game --> Ranking: ランキング表示
  Ranking --> Game: 閉じる
  Game --> ExitConfirm: 戻る/ブラウザバック
  ExitConfirm --> Game: 続ける
  ExitConfirm --> Index: 終了
```

### 5. 要件定義 (マインドマップ)
```mermaid
mindmap
  root((Cross Stage))
    機能要件
      ゲームプレイ
        リズムアクション
          タップ判定
          ホールド判定
          コンボシステム
        演出
          歌詞バブル
          3D背景
          パーティクル
      モード
        Cursor Mode PC/Touch
        Mobile Mode SP
        Body Mode 全身検知
        Face Mode 顔検知
      外部連携
        TextAlive 歌詞同期
        MediaPipe 身体認識
      データ管理
        オンラインランキング
        スコア登録API
    非機能要件
      パフォーマンス
        低遅延処理
        SPA遷移
      セキュリティ
        Bot対策 Turnstile
        改ざん防止 HMAC
        レート制限
      ユーザビリティ
        レスポンシブ
        アクセシビリティ
```

### 6. 開発スケジュール (ガントチャート)
```mermaid
gantt
    title Cross Stage 開発ロードマップ (2025/10 - 2026/01)
    dateFormat  YYYY-MM-DD
    axisFormat %m/%d
    
    section 企画・要件定義
    企画               :done, a1, 2025-10-01, 14d
    要件定義           :done, a2, after a1, 14d
    デザイン           :done, a3, after a1, 20d
    
    section 開発フェーズ(Core)
    ゲーム機能       :done, b1, 2025-11-01, 20d
    歌詞同期           :done, b2, after b1, 12d
    基本モード         :done, b3, after b2, 12d
    
    section 開発フェーズ(Adv)
    カメラ検知         :done, c1, after b3, 20d
    API構築            :done, c2, after b3, 14d
    ランキング         :done, c3, after c2, 10d
    
    section テスト・調整
    演出               :done, d1, 2026-01-08, 3d
    テスト             :done, d2, after d1, 5d
    公開               :done, d3, after d2, 4d
```

### 7. API仕様

**API一覧**
| Method | Path | 概要 | 認証/条件 |
| --- | --- | --- | --- |
| GET | /api/health | ヘルスチェック | なし |
| GET | /api/config | Turnstile Site Key 取得 | なし |
| GET | /api/token | スコア署名トークン発行 | SCORE_SIGNING_SECRET 設定時のみ有効 |
| POST | /api/score | スコア登録 | FRONTEND_ORIGIN/Rate limit/HMAC/Turnstile (条件付き) |
| GET | /api/ranking | ランキング取得 | songId 必須 |
| DELETE | /admin/scores | スコア削除 | x-admin-token 必須 |

**スコア登録フロー**
```mermaid
flowchart TD
  A[リザルト画面で登録] --> B[Client: POST /api/score]
  B --> C{Origin OK?}
  C -- No --> E[403 Forbidden]
  C -- Yes --> D[Rate limit check]
  D -- Exceed --> E2[429 Too Many Requests]
  D -- OK --> F{SCORE_SIGNING_SECRET?}
  F -- Yes --> G[HMAC token verify + nonce]
  G -- Fail --> E3[401/403/409]
  G -- OK --> H{Turnstile enabled?}
  F -- No --> H
  H -- Yes --> I[Turnstile verify]
  I -- Fail --> E4[403 Invalid Token]
  H -- No --> J[Supabase insert]
  I -- OK --> J
  J --> K{DB OK?}
  K -- No --> E5[500 DB Error]
  K -- Yes --> L[200 OK]
```

---

## 💾 データベース設計

### ER図（単一テーブル）
```mermaid
erDiagram
  SCORES {
    uuid id PK
    text session_id
    text song_id
    text mode
    int score
    int max_combo
    text rank
    numeric accuracy
    boolean is_suspicious
    text player_name
    timestamptz created_at
  }
```

### テーブル定義 (scores)
| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | プライマリキー |
| session_id | text | 匿名セッションID |
| song_id | text | 楽曲ID |
| mode | text | cursor/body/mobile/face |
| score | integer | スコア |
| max_combo | integer | 最大コンボ |
| rank | text | ランク |
| accuracy | numeric | 精度(%) |
| is_suspicious | boolean | チート疑いフラグ |
| player_name | text | プレイヤー名 |
| created_at | timestamptz | 登録日時 |

---

## 🧩 モジュール設計

### モジュール分割図
```mermaid
graph TD
  subgraph Frontend
    UI[Pages/Components]
    Core[Game Core]
    Input[Input/Camera]
    Visuals[Effects/3D]
  end
  subgraph Backend
    Worker[Workers API]
    Rate[RateLimiter DO]
  end
  DB[(Supabase)]

  UI --> Core
  Core --> Input
  Core --> Visuals
  Core --> Worker
  Worker --> Rate
  Worker --> DB
```

### 主要モジュールの責務
| モジュール | 責務 | 主なファイル |
| --- | --- | --- |
| ルーティング/ページ | SPAルーティング、画面遷移 | src/App.tsx, src/pages/IndexPage.tsx, src/pages/GamePage.tsx |
| UIコンポーネント | ランキング表示、モード切替 | src/components/game/RankingModal.tsx, src/components/game/ModeTabs.tsx |
| ゲームコア | ゲーム進行、スコア、リザルト | src/game/GameManager.ts, src/game/GameLoop.ts |
| 歌詞描画 | バブル生成、表示、判定補助 | src/game/GameManager.ts (LyricsRenderer) |
| 入力/カメラ | マウス/タッチ/カメラ入力、Pose/Face 判定 | src/game/GameManager.ts (InputManager, Detectors) |
| Workers API | スコア登録/ランキング取得/管理 | worker/index.ts, worker/routes/score.ts |
| レート制限 | Durable Object による制限/Nonce | worker/rateLimiter.ts |

### クラス図
```mermaid
classDiagram
  class App
  class IndexPage
  class GamePage
  class RankingModal
  class RankingPanel
  class ModeTabs
  class Slot

  class GameManager {
    +playMusic()
    +togglePlay()
    +restartGame()
    +showResults()
  }
  class GameLoop {
    +start()
    +stop()
  }
  class TimerManager {
    +setTimeout()
    +setInterval()
    +clearTimer()
    +clearAll()
  }
  class BubblePool {
    +acquire()
    +release()
    +releaseAll()
  }
  class LyricsRenderer
  class InputManager {
    +setupEvents()
  }
  class UIManager {
    +updateInstructions()
  }
  class EffectsManager {
    +createClickEffect()
  }
  class ResultsManager {
    +showResults()
  }
  class FaceDetectionManager {
    +init()
  }
  class BodyDetectionManager {
    +isReady()
    +isCountdownActive()
  }
  class ViewportManager {
    +updateViewportHeight()
  }
  class LiveStageVisuals

  class ScoreService
  class TokenService

  class WorkerIndexApp
  class WorkerScoreRoute
  class WorkerAdminRoute
  class WorkerScoreService
  class WorkerAdminService
  class WorkerScoreSchemas
  class RequestIdMiddleware
  class SessionMiddleware
  class AdminAuthMiddleware
  class RateLimiter
  class WorkerSupabaseClient

  class ServerIndexApp
  class ServerScoreRoute
  class ServerScoreService
  class ServerRateLimiter
  class ServerRankingCache
  class ServerScoreValidation
  class ServerSupabaseClient

  App --> IndexPage : route
  App --> GamePage : route
  GamePage --> GameManager : owns
  GamePage --> RankingModal : uses
  GamePage --> RankingPanel : uses
  GamePage --> ModeTabs : uses
  GamePage --> Slot : uses
  GamePage --> ScoreService : submit score
  GamePage --> TokenService : fetch token
  RankingModal --> RankingPanel : contains

  GameManager --> GameLoop : frame loop
  GameManager --> TimerManager : timeouts/intervals
  GameManager --> BubblePool : lyric bubble reuse
  GameManager --> LyricsRenderer : spawn/animate lyrics
  GameManager --> InputManager : pointer/gesture
  GameManager --> UIManager : HUD updates
  GameManager --> EffectsManager : particles
  GameManager --> ResultsManager : result flow
  GameManager --> ViewportManager : resize
  GameManager --> FaceDetectionManager : face mode
  GameManager --> BodyDetectionManager : body mode
  GameManager --> LiveStageVisuals : 3D stage
  BodyDetectionManager --> TimerManager : countdown timers

  ScoreService ..> WorkerIndexApp : HTTP /api/score
  ScoreService ..> ServerIndexApp : HTTP /api/score (dev)
  TokenService ..> WorkerIndexApp : HTTP /api/token
  TokenService ..> ServerIndexApp : HTTP /api/token (dev)

  WorkerIndexApp --> WorkerScoreRoute : /api/score
  WorkerIndexApp --> WorkerAdminRoute : /admin/scores
  WorkerIndexApp --> RequestIdMiddleware : requestId
  WorkerIndexApp --> SessionMiddleware : sessionId
  WorkerAdminRoute --> AdminAuthMiddleware : adminAuth
  WorkerScoreRoute --> WorkerScoreSchemas : validate
  WorkerScoreRoute --> WorkerScoreService : handle
  WorkerAdminRoute --> WorkerAdminService : handle
  WorkerScoreService --> RateLimiter : IP/nonce
  WorkerScoreService --> WorkerSupabaseClient : insert/select
  WorkerAdminService --> WorkerSupabaseClient : delete
  WorkerIndexApp --> WorkerSupabaseClient : client init

  ServerIndexApp --> ServerScoreRoute : /api/*
  ServerScoreRoute --> ServerRateLimiter : rate limit
  ServerScoreRoute --> ServerScoreValidation : validate
  ServerScoreRoute --> ServerRankingCache : cache
  ServerScoreRoute --> ServerScoreService : persist/query
  ServerScoreService --> ServerSupabaseClient : db

  note for App "src/App.tsx"
  note for IndexPage "src/pages/IndexPage.tsx"
  note for GamePage "src/pages/GamePage.tsx"
  note for RankingModal "src/components/game/RankingModal.tsx"
  note for RankingPanel "src/components/game/RankingPanel.tsx"
  note for ModeTabs "src/components/game/ModeTabs.tsx"
  note for Slot "src/components/game/Slot.tsx"
  note for ScoreService "src/services/scoreService.ts"
  note for TokenService "src/services/tokenService.ts"

  note for GameManager "src/game/GameManager.ts"
  note for GameLoop "src/game/GameLoop.ts"
  note for TimerManager "src/game/TimerManager.ts"
  note for BubblePool "src/game/BubblePool.ts"
  note for LyricsRenderer "src/game/managers/LyricsRenderer.ts"
  note for InputManager "src/game/managers/InputManager.ts"
  note for UIManager "src/game/managers/UIManager.ts"
  note for EffectsManager "src/game/managers/EffectsManager.ts"
  note for ResultsManager "src/game/managers/ResultsManager.ts"
  note for FaceDetectionManager "src/game/managers/FaceDetectionManager.ts"
  note for BodyDetectionManager "src/game/managers/BodyDetectionManager.ts"
  note for ViewportManager "src/game/managers/ViewportManager.ts"
  note for LiveStageVisuals "src/game/managers/LiveStageVisuals.ts"

  note for WorkerIndexApp "worker/index.ts"
  note for WorkerScoreRoute "worker/routes/score.ts"
  note for WorkerAdminRoute "worker/routes/admin.ts"
  note for WorkerScoreService "worker/services/scoreService.ts"
  note for WorkerAdminService "worker/services/adminService.ts"
  note for WorkerScoreSchemas "worker/schemas/scoreSchemas.ts"
  note for RequestIdMiddleware "worker/middleware/requestId.ts"
  note for SessionMiddleware "worker/middleware/session.ts"
  note for AdminAuthMiddleware "worker/middleware/admin.ts"
  note for RateLimiter "worker/rateLimiter.ts"
  note for WorkerSupabaseClient "worker/supabaseClient.ts"

  note for ServerIndexApp "server/index.ts"
  note for ServerScoreRoute "server/routes/score.ts"
  note for ServerScoreService "server/services/scoreService.ts"
  note for ServerRateLimiter "server/services/rateLimiter.ts"
  note for ServerRankingCache "server/services/rankingCache.ts"
  note for ServerScoreValidation "server/services/scoreValidation.ts"
  note for ServerSupabaseClient "server/supabaseClient.ts"
```

---

## 📦 ディレクトリ構成

```bash
star/
├── src/                  # フロントエンド・ソースコード
│   ├── components/       # React UIコンポーネント (Ranking, Modal等)
│   ├── game/             # ゲームコアロジック
│   │   ├── GameManager.ts # ゲーム進行管理
│   │   ├── GameLoop.ts    # メインループ
│   │   └── ...           
│   ├── pages/            # ルーティングページ (Index, Game)
│   └── styles.css        # グローバルスタイル・アニメーション定義
└── worker/               # バックエンド・API (Cloudflare Workers)
    ├── index.ts          # Hono エントリーポイント
    ├── rateLimiter.ts    # レート制限 (Durable Object)
    └── ...
```

---

## 🧪 テスト仕様（ユーザビリティ視点）

### 結合テスト 
| ID | シーン | 手順/入力 | 期待結果（ユーザビリティ） |
| --- | --- | --- | --- |
| 01 | タイトル導線 | モードを切り替える | 選択中のモードが視覚的に強調され、説明文も即時に更新される |
| 02 | 遊び方モーダル | 「遊び方」を開く→閉じる | 内容が読みやすく表示され、閉じる操作で元画面に戻る |
| 03 | ランキングモーダル | 「ランキング」→期間/モード切替→閉じる | 一覧が更新され、閉じると元の画面へ戻れる |
| 04 | ゲーム開始 | 「ゲームスタート」→ロード完了待ち | ロード中表示があり、再生/リスタートが無効→準備完了で有効化される |
| 05 | 再生/一時停止 | 再生→一時停止→再生 | ボタン表記が状態に一致し、歌詞/スコア更新が停止/再開する |
| 06 | マウス操作 | バブルを長押し | 進捗表示が出てスコア/コンボが加算され、離すと解除される |
| 07 | モバイル操作 | タップで長押し | 指操作でもホールドでき、誤操作が起きにくい |
| 08 | ボディモード開始 | 全身が映る→カウントダウン完了 | 調整メッセージ→カウントダウン→再生開始の順で表示される |
| 09 | ボディモード警告 | 再生中に全身が外れる | 一定時間後に警告が表示され、復帰で警告が消える |
| 10 | フェイスモード | 口を開く/閉じる | 開口時のみホールド判定、閉口で解除される |
| 11 | リザルト表示 | 曲終了 | リザルト画面が表示され、スコア/最大コンボ/ランク/名前入力が視認できる |
| 12 | スコア登録成功 | 名前入力→登録 | 「登録完了」に変わり、ボタンが無効化される |
| 13 | スコア登録失敗 | 通信失敗を模擬→登録 | 「登録失敗(再試行)」に変わり、再試行が可能になる |
| 14 | 未登録の離脱 | 登録せずにタイトル/リトライ | 確認モーダルが表示され、続ける/終了するを選べる |
| 15 | ランキング空表示 | スコアなしの曲でランキング表示 | 「まだスコアがありません」等の案内が出る |
| 16 | ランキング通信失敗 | /api/ranking 失敗 | エラーメッセージが表示され、画面がフリーズしない |

### 単体テスト 
| ID | 対象 | 条件/入力 | 期待結果（ユーザビリティ） |
| --- | --- | --- | --- |
| 01 | UIManager | モード切替操作 | 画面の操作説明文が各モードに適した文言に更新される |
| 02 | PlayButton | 再生/一時停止の切替 | ボタン表記やアイコンが「再生」「一時停止」に正しく切り替わる |
| 03 | BodyWarning | 警告有効/無効 | 全身が映っていない時の警告メッセージ表示の有無が正しく切り替わる |
| 04 | CountDown | ランドマーク検出 | カウントダウン開始/キャンセル、警告文表示が正しく切り替わる |
| 05 | FaceDetection | 口開/閉の判定 | 開口時のみ判定座標が有効になり、閉口時は解除される |
| 06 | SubmitButton | 登録処理の状態変化 | 成功/失敗に応じてボタンの文言が変わり、連打が防止(disabled)される |
| 07 | ConfirmModal | 離脱イベント発火 | メッセージと遷移アクション（OK/Cancel）が正しく設定される |
| 08 | RankingList | データ状態(loading/error/empty) | 「ロード中」「エラー」「データなし」の表示が正しく切り替わる |
| 09 | RankCalculator | スコア境界値 | ランク表示（S/A/B/C）が境界値で正しく判定される |

---

## 🔧 開発・デプロイ

### 必須要件
- Node.js 20+
- Cloudflare アカウント (Workers / Turnstile)
- Supabase プロジェクト

### セットアップ

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **環境変数の設定**
    `.env` ファイルを作成し、必要なAPIキーを設定します

3. **開発サーバー起動**
   ```bash
   # フロントエンド + バックエンド(エミュレーション)
   npm run dev
   npm run cf:dev
   ```

4. **デプロイ**
   ```bash
   npm run deploy
   ```

---

## 📜 ライセンス & クレジット

- **License**: MIT
- **Music & Lyrics**: Powered by [TextAlive App API](https://api.songle.jp/) (National Institute of Advanced Industrial Science and Technology - AIST).
- **Vision AI**: MediaPipe by Google.
- **Special Thanks**: 加賀（ネギシャワーP） ストリートライト piapro（https://piapro.jp/t/ULcJ）