# Cross Stage 技術Q&A

作品展で「何を聞かれても即答できる」ことを目的に、設計意図と運用ポイントを一問一答で整理しました。短く・具体的に答える形にしています。

## プロダクトと体験

Q. 何をするプロダクト？  
A. 歌詞が流れるタイミングに合わせて「触れる/押さえる」Web リズムゲーム。TextAlive で歌詞同期、MediaPipe で身体や手の動きを入力に変換し、Three.js のライブ演出で没入感を作ります。

Q. どんなプレイモード？  
A. `cursor`（マウス/タッチ基本形）、`body`（Pose で全身入力）、`mobile`（タッチ専用UI・小型歌詞）、`hand`（Hands 拡張枠）。モバイル検出時は UI 側で `mobile` を優先選択（src/components/game/ModeTabs.tsx）。

Q. 判定の特徴は？  
A. 「ホールド判定」型。歌詞バブルを一定時間押さえてゲージ満タン→コンボ加算。スポーン時の重なり回避、ホールド中は最前面化で操作性を担保。

Q. 歌詞同期が壊れたら？  
A. TextAlive から時刻取得が失敗しても、GameManager にあるフォールバック歌詞＋自前タイマーで進行を続け、ゲームを止めません。

## 全体アーキテクチャ

Q. 技術スタックは？  
A. フロント：React 18 + Vite + Tailwind + Three.js + TextAlive + MediaPipe。  
　API/配信：Cloudflare Workers + Hono（worker/index.ts）。開発時は Node 版 Hono（server/index.ts）で SPA 配信。  
　DB：Supabase (PostgreSQL)。  
　検証：TypeScript + Zod。

Q. なぜ Workers/Hono？  
A. エッジ実行で低レイテンシ、デプロイが軽い、型安全なハンドラが書ける。API と静的配信の両方を小さくまとめられる。

Q. SPA ルーティングの仕組みは？  
A. Hono でワイルドカードに index.html を返すフォールバックを設定し、任意 URL からもクライアントルーティングで起動（server/index.ts）。

Q. 外部ライブラリのロード方法は？  
A. docs/index.html で TextAlive・MediaPipe・Three.js を CDN から読み込み。ビルド成果物（JS/CSS）も docs 配下に配置してそのままホスティング可能。

## フロントエンド実装

Q. ランキング UI のデータ取得フローは？  
A. `/api/v1/scores` に fetch → 30 秒クライアントキャッシュ（Map）。mode 指定が失敗したら mode なし再試行、最後は旧 `/api/ranking` にフォールバック（src/components/game/RankingPanel.tsx）。

Q. ゲーム開始までの導線は？  
A. URL パラメータ/LocalStorage/端末特性から初期モードを決定し GameManager を初期化。popstate/beforeunload をフックしてプレイ中の誤離脱を防止（src/pages/GamePage.tsx）。

Q. カメラと背景合成は？  
A. MediaPipe Pose/SelfieSegmentation で人物を切り出し、canvas に合成。全身未検出ならカウントダウン・警告を出してから開始するロジックを GameManager に保持。

Q. UI/UX の配慮点は？  
A. モバイルでは歌詞を自動縮小・折返し、ランキング HUD 位置調整。ネオン＋ガラスモーフィズムのライブ会場風テーマ。ブラウザバック防止モーダルあり。

## バックエンド/API

Q. 提供 API と役割は？  
A. `/api/v1/scores`（Cloudflare Workers）。POST: スコア登録、GET: ランキング取得。ヘルスチェック `/api/v1/health`。旧互換として Node 版の `/api/ranking` も残置。

Q. スコア登録のバリデーションは？  
A. Zod で厳格チェック: playerName 1–20 文字（制御文字除去）、songId 英数/`-_` 最大 64、mode は enum、score/maxCombo は 0 以上 int、rank 1–5 文字、accuracy 0–100。1,000,000 超は `is_suspicious=true` でランキング除外。

Q. ランキング取得の仕様は？  
A. クエリ: songId 必須、mode 任意（デフォルト cursor）、limit 1–50。`is_suspicious=false` のみ返却、score desc で limit 件。レスポンスに count/total と requestId を付与。

Q. 管理 API は？  
A. `/admin/scores` DELETE で全削除。`x-admin-token` 必須（worker/routes/admin.ts）。展示時は環境変数 `ADMIN_TOKEN` を必ず設定。

Q. 保存データと識別子は？  
A. Supabase `scores` に保存。匿名セッション ID は httpOnly/SameSite=Lax/Secure の `cs_session` クッキー（1 年）で紐付け。個人情報は任意の player_name のみ。

## データベース

Q. スキーマ概要は？  
A. `supabase_scores.sql` に定義。id(uuid), session_id, song_id, mode(check: cursor/body/mobile/hand), score, max_combo, rank, accuracy, is_suspicious, player_name, created_at。インデックス `(song_id, mode, score desc)`。pgcrypto で UUID 生成。

Q. RLS はある？  
A. 現状なし。Origin チェックと入力検証で守っているが、公開度合いが上がる場合は RLS + サービスロール or Edge Functions 化を推奨。

Q. 新曲を追加する手順は？  
A. `src/types/game.ts` の `songsData` に曲情報（id/title/artist/apiToken/songUrl）を追加し、GameManager のデフォルト songId を合わせる。

## セキュリティ・チート耐性

Q. 不正投稿をどう抑止？  
A. Zod で型/範囲強制、songId 正規表現で SQL インジェクションを防止、スコア上限で `is_suspicious` フラグ付けしランキング除外。Origin が `FRONTEND_ORIGIN` 以外（ローカル除く）なら 403。管理 API は固定トークン。

Q. 既知のリスクは？  
A. RLS なしなので anon key 流出時は直接書き込みリスク。スコア異常検知は単純閾値で、速度・頻度ベースの高度な検知は未実装。会場ネットワークで HTTPS/TLS が確保されているかは事前確認が必要。

Q. セッション管理は？  
A. httpOnly/Secure/SameSite=Lax の `cs_session` クッキーで匿名セッションを維持。セッション ID と requestId をログに付与してトレース可能。

## パフォーマンスと可用性

Q. レイテンシ対策は？  
A. API を Workers でエッジ実行、静的は Vite ビルド成果物を CDN 配信想定。ランキングはクライアント 30 秒キャッシュ＋API limit で帯域削減。

Q. フォールトトレランスは？  
A. TextAlive ダウン時もフォールバック歌詞で進行。スコア送信はキーで重複防止し、失敗してもゲームが落ちない。beforeunload で離脱警告、GameManager.cleanup でリソース解放。

Q. 重い端末向けの工夫は？  
A. モバイル UI 簡素化、歌詞バブル縮小、余分な viewer 歌詞を無効化済み。Three.js 演出は軽量化したプリセット。

## 運用・デプロイ

Q. 必要な環境変数は？  
A. `.dev.vars` 例:  
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=***
ADMIN_TOKEN=***
FRONTEND_ORIGIN=https://example.com
```
Workers では `wrangler secret put` で登録。

Q. ローカル開発の流れは？  
A. `npm install` → `npm run dev` で Vite(:5173) と Hono 開発サーバー(:8787) 同時起動。Workers 実機確認は `npm run cf:dev`。

Q. デプロイ手順は？  
A. `npm run deploy` で Vite ビルド＋wrangler deploy。静的成果物は `docs/` に置くので GitHub Pages 等でも配信可。

Q. ログはどこで見る？  
A. Workers: Cloudflare ダッシュボードまたは `wrangler tail`。Node 開発サーバー: コンソール。すべてのレスポンスに requestId を付与。

## テスト・確認観点（聞かれがち）

Q. 何をテストしている？  
A. 手動確認が中心。ゲーム進行・スコア送信・ランキング表示の往復、モバイル切替、TextAlive ダウン時のフォールバック、Origin チェックで 403 になることを確認する運用フロー。

Q. 次に強化するとしたら？  
A. Supabase RLS 導入、スコア異常検知の多段ロジック（速度・頻度・連投 IP チェック）、E2E テスト（Playwright）でモード切替とスコア送信の自動化。
