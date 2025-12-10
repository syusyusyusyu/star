# Cross Stage 技術Q&A

作品展で「何を聞かれても即答できる」ためのチートシート。学生ノリで、でも技術は外さず短く答えます。

## プロダクトと体験

Q. 何をするプロダクト？  
A. 歌詞のタイミングで「触れて遊ぶ」Web リズムゲーム。TextAlive で歌詞同期、MediaPipe で体や手を入力にして、Three.js のライブ演出でテンション上げるやつです。

Q. どんなプレイモード？  
A. `cursor`(マウス/タッチ), `body`(Pose 全身), `mobile`(タッチ特化UI), `hand`(Hands 用の枠)。スマホなら自動で mobile に寄せます（src/components/game/ModeTabs.tsx）。

Q. 判定の特徴は？  
A. ホールド型。バブルを押さえてゲージ満タン→コンボ。重なりを避けて出し、ホールド中は最前面にして触りやすくしています。

Q. 歌詞同期が壊れたら？  
A. TextAlive が落ちても自前の歌詞データとタイマーで続行します。ゲームは止めません。

## 全体アーキテクチャ

Q. 技術スタックは？  
A. フロント: React 18 + Vite + Tailwind + Three.js + TextAlive + MediaPipe。  
　API/配信: Cloudflare Workers + Hono。開発は Node 版 Hono も使ってます。  
　DB: Supabase(PostgreSQL)。  
　検証: TypeScript + Zod。

Q. なんで React + Vite？  
A. 立ち上がりが爆速で、HMR が安定。Three.js や外部 SDK を混ぜてもビルドが軽いのでデモ向き。

Q. なんで Tailwind？  
A. UI を短時間で組むため。ネオンやガラス系の細かい調整をユーティリティで即書きたいから。

Q. Three.js をどう使ってる？  
A. ライブステージの背景やライト演出に使ってます。ゲームロジックとは分離し、見た目の没入感担当。

Q. TextAlive は何をしてる？  
A. 楽曲の再生制御と歌詞タイミングを提供。フレーズ/単語単位で時刻をもらい、歌詞バブルを同期表示する基準になってます。

Q. MediaPipe は何をしてる？  
A. Pose で全身ランドマーク、SelfieSegmentation で背景切り抜き、Hands 用の枠も確保。体/手の動きをゲーム入力にマップします。

Q. なぜ Workers/Hono？  
A. エッジで軽く動くしデプロイが速いから。型も付けやすくて小さく API と静的配信をまとめられます。

Q. インフラ構成の全体像は？  
A. Cloudflare Workers が API を提供し、静的ファイルは docs/ をそのまま配信する想定（Pages でもいける）。DB は Supabase（マネージド Postgres）。開発時は Node 版 Hono でローカル配信。

Q. なんで Supabase？  
A. Postgres ベースでセットアップが速く、anon key でフロントから直接叩ける手軽さがある。RLS も後から足しやすい。

Q. なんで Docker もある？  
A. ローカル環境を揃えるための開発用（docker-compose.dev.yml）。本番は Workers なのでコンテナをそのまま本番には使わない想定。

Q. 環境はどこに置く？  
A. 本番：Cloudflare（Workers + 静的配信）。DB：Supabase クラウド。開発：ローカル（Vite + Node Hono）、CF dev で Workers を模擬。

Q. SPA ルーティングの仕組みは？  
A. Hono がどのパスでも index.html を返すフォールバック持ち。なので直リンクでも React で起動します。

Q. 外部ライブラリのロード方法は？  
A. docs/index.html から CDN 読み込み（TextAlive, MediaPipe, Three.js）。ビルド物も docs/ に吐いてそのまま置くだけ。

## フロントエンド実装

Q. ランキング UI のデータ取得フローは？  
A. `/api/v1/scores` を叩いて 30 秒キャッシュ。mode 指定で失敗したら mode なしで再トライ、ダメなら旧 `/api/ranking` にフォールバック（src/components/game/RankingPanel.tsx）。

Q. ゲーム開始までの導線は？  
A. URL・LocalStorage・端末特性から初期モードを決めて GameManager を初期化。popstate/beforeunload で誤離脱ガード（src/pages/GamePage.tsx）。

Q. カメラと背景合成は？  
A. Pose/SelfieSegmentation で人だけ切り出して canvas 合成。全身が映ってないと警告→カウントダウンで開始。

Q. UI/UX の配慮点は？  
A. モバイルは歌詞縮小・折返しで見切れ防止。ランキング HUD も重なりにくく配置。見た目はネオン×ガラス。戻る操作は確認モーダルで止めます。

## バックエンド/API

Q. 提供 API と役割は？  
A. `/api/v1/scores`（Workers）。POST: スコア登録、GET: ランキング取得。ヘルスチェック `/api/v1/health`。古い `/api/ranking` も残してます。

Q. スコア登録のバリデーションは？  
A. Zod で型と範囲をガチガチにチェック。playerName 1–20 文字（制御文字除去）、songId 英数/`-_` 64 文字まで、mode は enum、score/maxCombo は 0 以上 int、rank 1–5 文字、accuracy 0–100。100 万点超えは `is_suspicious=true` で除外。

Q. ランキング取得の仕様は？  
A. クエリ: songId 必須、mode 任意(デフォ cursor)、limit 1–50。`is_suspicious=false` だけ返し、score desc で limit 件。count/total と requestId を付けます。

Q. 管理 API は？  
A. `/admin/scores` DELETE で全削除。`x-admin-token` が必要。`ADMIN_TOKEN` は環境変数に入れておきます。

Q. 保存データと識別子は？  
A. Supabase `scores` に保存。匿名セッションは httpOnly/SameSite=Lax/Secure の `cs_session`（1 年）で紐付け。個人情報は任意入力の player_name だけ。

## データベース

Q. スキーマ概要は？  
A. `supabase_scores.sql` に定義。id(uuid), session_id, song_id, mode(check: cursor/body/mobile/hand), score, max_combo, rank, accuracy, is_suspicious, player_name, created_at。インデックス `(song_id, mode, score desc)`。pgcrypto で UUID 生成。

Q. RLS はある？  
A. まだ付けてません。Origin チェックとバリデーションで守ってますが、ガチ公開なら RLS + サービスロール or Edge Functions を検討。

Q. 新曲を追加する手順は？  
A. `src/types/game.ts` の `songsData` に曲情報（id/title/artist/apiToken/songUrl）を足して、GameManager のデフォルト songId を合わせれば OK。

## セキュリティ・チート耐性

Q. 不正投稿をどう抑止？  
A. Zod で型と範囲を強制、songId は正規表現で縛る、100 万超は `is_suspicious` で弾く。Origin が `FRONTEND_ORIGIN` 以外（ローカル除く）なら 403。管理 API は固定トークン。

Q. 既知のリスクは？  
A. RLS なしなので anon key が漏れると直書きリスク。異常検知はシンプル閾値だけで、速度・頻度チェックは未実装。会場の HTTPS/TLS は事前に確認が必要。

Q. セッション管理は？  
A. httpOnly/Secure/SameSite=Lax の `cs_session` で匿名セッション。requestId と合わせてログに残し、追跡できます。

## パフォーマンスと可用性

Q. レイテンシ対策は？  
A. API は Workers でエッジ実行、静的は CDN 想定。ランキングは 30 秒キャッシュと limit で帯域を削減。

Q. フォールトトレランスは？  
A. TextAlive が落ちてもフォールバック歌詞で続行。スコア送信はキーで重複防止。beforeunload で離脱警告、cleanup でリソース解放。

Q. 重い端末向けの工夫は？  
A. モバイル UI を簡素化、歌詞バブル縮小、viewer 歌詞はオフ。Three.js 演出も軽めに。

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
A. `npm install` → `npm run dev` で Vite(:5173) と Hono(:8787) を同時起動。Workers 実機は `npm run cf:dev`。

Q. デプロイ手順は？  
A. `npm run deploy` で Vite ビルド→wrangler deploy。静的成果物は `docs/` にあるので GitHub Pages でも配信OK。

Q. ログはどこで見る？  
A. Workers: Cloudflare ダッシュボード or `wrangler tail`。Node 開発サーバー: コンソール。レスポンスに requestId が付きます。

## テスト・確認観点（聞かれがち）

Q. 何をテストしている？  
A. 手動中心。ゲーム進行→スコア送信→ランキング表示、モバイル切替、TextAlive ダウン時のフォールバック、Origin チェックで 403 になるかを一通り見る運用です。

Q. 次に強化するとしたら？  
A. Supabase RLS を入れる、スコア異常検知を多段化（速度/頻度/IP）、E2E テスト（Playwright）でモード切替とスコア送信を自動化したいです。
