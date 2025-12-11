# Cross Stage 技術Q&A

作品展で即答するためのチートシート。学生ノリで短く、スライド読み上げしやすい文量にしています。

## プロダクトと体験
Q. 何をするプロダクト？
A. 歌詞タイミングで「触れて遊ぶ」Webリズムゲーム。歌詞同期=TextAlive、体/手入力=MediaPipe、演出=Three.js。

Q. どんなプレイモード？
A. `cursor`(マウス/タッチ) / `body`(全身) / `mobile`(タッチ特化) / `hand`(拡張枠)。スマホ検出→自動でmobile。

Q. 判定の特徴は？
A. ホールド型。押さえてゲージ満タン→コンボ。重なり回避＆ホールド中は最前面で触りやすく。

Q. 歌詞同期が壊れたら？
A. TextAliveが落ちてもフォールバック歌詞＋自前タイマーで続行。ゲームは止めない。

## 全体アーキテクチャ
Q. 技術スタックは？
A. フロント: React 18 / Vite / Tailwind / Three.js / TextAlive / MediaPipe。API: Cloudflare Workers + Hono（開発はNode版も）。DB: Supabase(PostgreSQL)。検証: TypeScript + Zod。

Q. なんでReact+Vite？
A. 起動とHMRが速い。Three.jsや外部SDKを混ぜてもビルドが軽くデモ向き。

Q. なんでTailwind？
A. 短期間でUIを組むため。ネオン/ガラス系の調整をユーティリティで即書きしたい。

Q. Three.jsはどこで？
A. 背景ステージとライト演出。ロジックと分離して見た目担当。

Q. TextAliveは何をしてる？
A. 再生制御＋歌詞タイミング提供。フレーズ/単語時刻を基準にバブル同期。

Q. MediaPipeは何をしてる？
A. Poseで全身ランドマーク、SelfieSegmentationで背景切り抜き、Hands枠も用意。動きを入力にマップ。

Q. なぜWorkers/Hono？
A. エッジで軽くデプロイが速い。型も付けやすく、APIと静的配信を小さくまとめられる。

Q. インフラ構成は？
A. API=Cloudflare Workers、静的=docs/配信（Workers/Pagesどちらも可）、DB=Supabase。開発はNode版Hono+Vite、`cf dev`でWorkers模擬。

Q. なんでSupabase？
A. Postgresベースでセットアップが速い。anon keyで手軽、SQL/RLS拡張性も確保。

Q. なんでDockerもある？
A. ローカル環境を揃えるための開発用（docker-compose.dev.yml）。本番はWorkersで動かす想定。

## フロントエンド実装
Q. ランキング取得フローは？
A. `/api/ranking` → 30秒クライアントキャッシュ。mode失敗→modeなし再トライ→旧`/api/ranking`にフォールバック（src/components/game/RankingPanel.tsx）。

Q. ゲーム開始までの導線は？
A. URL/LocalStorage/端末特性で初期モード決定→GameManager初期化。popstate/beforeunloadで誤離脱ガード（src/pages/GamePage.tsx）。

Q. カメラと背景合成は？
A. Pose/SelfieSegmentationで人物を抜いてcanvas合成。全身未検出なら警告→カウントダウン開始。

Q. UI/UXの配慮は？
A. モバイルで歌詞縮小・折返し、HUD位置調整。ネオン×ガラスの見た目。戻る操作は確認モーダルで止める。

## バックエンド/API
Q. 提供APIは？
A. `/api/score` (POST), `/api/ranking` (GET)（Workers）。ヘルスチェック`/api/health`。

Q. スコア登録のバリデーションは？
A. Zodで厳格チェック。playerName1-20、songId英数/`-_`<=64、mode enum、score/maxCombo>=0 int、rank1-5、accuracy0-100。100万超は`is_suspicious=true`で除外。

Q. ランキング取得の仕様は？
A. クエリ: songId必須、mode任意(デフォcursor)、limit1-50。`is_suspicious=false`のみ返し、score descでlimit件。count/totalとrequestId付き。

Q. 管理APIは？
A. `/admin/scores` DELETEで全削除。`x-admin-token` 必須。`ADMIN_TOKEN`は環境変数で設定。

Q. 保存データは？
A. Supabase `scores`。匿名セッションはhttpOnly/SameSite=Lax/Secureの`cs_session`(1年)で紐付け。個人情報は任意のplayer_nameのみ。

## データベース
Q. スキーマ概要は？
A. `supabase_scores.sql`参照。id uuid, session_id, song_id, mode(check), score, max_combo, rank, accuracy, is_suspicious, player_name, created_at。インデックス`(song_id, mode, score desc)`、pgcryptoでUUID生成。

Q. RLSは？
A. まだ無し。Originチェック＋入力検証で守っているが、公開度が上がるならRLS+サービスロール/Edge Functionsを検討。

Q. 新曲の追加は？
A. `src/types/game.ts`の`songsData`に曲情報を追加し、GameManagerのデフォsongIdを合わせる。

## セキュリティ・チート耐性
Q. 不正投稿どう防ぐ？
A. Zodで型/範囲強制、songId正規表現、100万超は`is_suspicious`で弾く。Originが`FRONTEND_ORIGIN`以外（ローカル除く）なら403。管理APIは固定トークン。

Q. 既知リスクは？
A. RLS無しなのでanon key流出時に直書きリスク。異常検知は単純閾値だけ。会場のHTTPS/TLSは事前確認必須。

Q. セッション管理は？
A. httpOnly/Secure/SameSite=Laxの`cs_session`で匿名セッション。requestIdと合わせてログで追跡。

## パフォーマンスと可用性
Q. レイテンシ対策は？
A. APIをWorkersでエッジ実行、静的はCDN想定。ランキングは30秒キャッシュ＋limitで帯域削減。

Q. フォールトトレランスは？
A. TextAliveが落ちてもフォールバック歌詞で続行。スコア送信はキーで重複防止。beforeunloadで離脱警告、cleanupで解放。

Q. 重い端末向け工夫は？
A. モバイルUI簡素化、歌詞バブル縮小、viewer歌詞オフ。Three.js演出も軽め。

## 運用・デプロイ
Q. 必要な環境変数は？
A. `.dev.vars`例:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=***
ADMIN_TOKEN=***
FRONTEND_ORIGIN=https://example.com
```
Workersでは`wrangler secret put`で登録。

Q. ローカル開発の流れは？
A. `npm install` → `npm run dev` でVite(:5173)とHono(:8787)同時起動。Workers実機は`npm run cf:dev`。

Q. デプロイ手順は？
A. `npm run deploy` でViteビルド→wrangler deploy。静的成果物は`docs/`にあるのでGitHub Pages等でも配信可。

Q. ログはどこで見る？
A. Workers: Cloudflareダッシュボード or `wrangler tail`。Node開発サーバー: コンソール。レスポンスにrequestId付き。

## テスト・確認観点
Q. 何をテストしている？
A. 手動中心。ゲーム進行→スコア送信→ランキング表示、モード切替、TextAliveダウン時フォールバック、Originチェックで403になるかを一通り確認。

Q. 次に強化するとしたら？
A. Supabase RLS追加、スコア異常検知の多段化（速度/頻度/IP）、PlaywrightでE2E自動化。

## 「なんで〇〇じゃないの？」に答える
Q. Next.jsじゃないの？
A. SSR不要でViteの速さ優先。Workers配信のSPAで十分。

Q. Express/Fastifyじゃないの？
A. エッジ対応とバンドル軽量化でHono。Workersとの相性と型付けのしやすさ重視。

Q. Firebaseじゃないの？
A. Postgresを使いたくてSupabase。SQL/RLSの拡張性を取りたかった。

Q. Prisma使わないの？
A. Supabaseクライアント直叩きで足りる。ORMバンドルを削って軽量化。

Q. Babylon.jsは？
A. チーム経験がThree.js寄り。短期で仕上げるため慣れたスタックを採用。

Q. WebRTC/Socketは？
A. 今回はランキングのみで不要。リアルタイム対戦・観戦をやるなら追加検討。

Q. Redux/Recoilは？
A. 状態が局所的なのでReact state/コンテキストで足りる。

Q. AWS/GCPじゃないの？
A. デプロイ速度・コスト・CDN近さでCloudflare。展示用に即デプロイを優先。
