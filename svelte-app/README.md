# Lyric Stage (Svelte port)

Svelte + Vite で既存の歌詞リズムゲームを動かす移植プロジェクトです。ランディングは Svelte、ゲームロジックはレガシー JS を public 配下からそのまま読み込む構成です。

## 開発（Windows PowerShell）

```powershell
# 依存をインストール
npm install

# 開発サーバを起動（ポートは自動調整されることがあります）
npm run dev
```

ターミナルに表示される Local の URL にアクセスします。例:
- http://localhost:5173/
- 既に使用中の場合: http://localhost:5174/ など

## 使い方

1. トップページで曲を選択します（モバイルではモードは Cursor 固定）。
2. ゲーム画面へ遷移後、「準備完了」になったら「再生」ボタンで開始。
3. 歌詞の文字にマウス（または手/全身モード）で触れてポイント獲得。
4. 曲終了でリザルト画面が表示されます。

Hand/Body モードでは初回にカメラ許可が必要です。明るい環境で手・全身が映るよう調整してください。

## よくあるトラブルと対処

- 404（HTTP ERROR 404）が出る
  - ターミナルの「Local: http://localhost:xxxx/」に表示された URL を使ってください（ポートが自動で変わることがあります）。
  - ブラウザのハードリロード（Ctrl+F5）やシークレットウィンドウで再アクセスしてください。
  - 直接 `http://localhost:PORT/index.html` を開くのも有効です。

- 警告: `Could not auto-determine entry point ... Skipping dependency pre-bundling.`
  - これは最適化（プリバンドル）スキップの警告で、動作に支障はありません。無視して問題ありません。

- カメラが映らない / 手・全身が検出されない
  - ブラウザのカメラ許可をオンにしてください。
  - 照明を明るくし、カメラから30〜60cm程度で手のひらをかざしてください。

## 構成

- `src/pages/IndexPage.svelte` … ランディング（曲選択、モード選択、星・スポットライト）
- `src/pages/GamePage.svelte` … ゲーム画面の DOM と外部スクリプトの読み込み
- `public/script.js` … ゲーム本体（GameManager / LiveStageVisuals）
- `public/game-loader.js` … 曲情報の適用と GameManager 初期化
- `public/styles.css` … ゲーム用スタイル

## 備考

- TextAlive / Three.js / MediaPipe は CDN から読み込みます（ネット接続が必要）。
- ゲームロジックはグローバル（`window.GameManager` など）として公開し、Svelte 側からは変更しません。

## ライセンス

本プロジェクトはベースとなるアセット/ライブラリのライセンスに従います。各ライブラリのライセンスをご確認ください。
