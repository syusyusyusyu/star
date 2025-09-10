# Lyric Stage

## プロジェクト概要
このプロジェクト「Lyric Stage」は、**YouTube動画と字幕を同期**して表示し、ユーザーが表示された歌詞にインタラクトすることでスコアを獲得する革新的なリズムゲームです。
TextAlive App API 前提の構成を廃止し、**YouTube IFrame API + 自動字幕 (timedtext?kind=asr) の取得**を基盤とする構成にリニューアルしました。

主要な特徴は以下の通りです。
- **字幕同期とインタラクション**: YouTube動画再生に合わせて字幕を正確なタイミングで表示。字幕は1文字ずつ出力され、ユーザーが表示された歌詞に触れる（クリック、タップ、または身体の動き）ことでスコアを獲得し、コンボを繋げます。
- **3Dライブステージの表現**: [Three.js](https://threejs.org/) を用いて、ゲームの背景にダイナミックな3Dライブステージを構築。視覚的な奥行きと臨場感を与え、ユーザーを仮想のライブ空間へと誘います。
- **カメラベースの多様なインタラクション**: [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose.html) と [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) を活用し、Webカメラを通じたユーザーの身体の動きをゲーム入力として利用。ペンライトを振るような手の動きや、全身を使ったインタラクションでプレイ可能です。

## セットアップと実行方法

### 1. ファイルの配置
本プロジェクトは、クライアントサイドのWebアプリケーションとして設計されています。
以下のすべてのファイル（`game-loader.js`, `game.html`, `index-scripts.js`, `index-styles.css`, `index.html`, `script.js`, `styles.css`）をWebサーバーの公開ディレクトリに配置してください。

### 2. 依存関係
フロントエンドの外部ライブラリはCDNから読み込まれるため、フロント単体では追加インストールは不要です。
ただし、YouTube字幕をCORS回避して取得するためのローカルプロキシ（`server.js`／Express）を使用するため、最初に `npm install` が必要です。

- **YouTube IFrame Player API**: YouTube動画の再生制御、現在時間の取得に利用。
- `https://www.youtube.com/iframe_api`
- **Three.js**: 3Dライブステージのレンダリング。
- `https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js`
- **MediaPipe Pose**: Webカメラから全身ランドマークを取得し、ボディモードでの入力に利用。
- `https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js`
- **MediaPipe Hands**: Webカメラから手のランドマークを取得し、ハンドモードでの入力に利用。
- `https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js`
- **MediaPipe Selfie Segmentation**: 人物と背景を分離し、ユーザーを3Dステージに合成。
- `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js`

### 3. 実行（Windows/PowerShell）
字幕取得プロキシ（8080）と静的サイト（8000）の2つを起動します。

1) 依存をインストール（初回のみ）
```powershell
npm install
```

2) 字幕プロキシを起動（ポート 8080）
```powershell
npm start
# -> Subtitle proxy server listening at http://localhost:8080
```

3) 静的サーバーでフロントを配信（ポート 8000）
```powershell
npx http-server -p 8000
# ブラウザで http://localhost:8000/index.html を開く
```

補足:
- `npx http-server` が無い環境では `npm install -g http-server` でも可。
- VS Code の「Live Server」拡張でも代替可（ポートは任意）。

【同時起動（推奨）】
```powershell
npm run dev
# 8080: 字幕プロキシ, 8000: フロント
```

## 遊び方

1. **タイトル画面**: YouTube URL入力欄に動画URLを貼り、「再生」ボタンを押す。
2. **プレイモード選択**:
- **カーソルモード**: タップで歌詞に触れる
- **ハンドモード**: Webカメラで手を検出して操作
- **ボディモード**: Webカメラで全身を検出して操作
3. **ゲームプレイ**:
- YouTube動画が再生されると自動字幕を取得し、1文字ずつ表示される
- 歌詞に触れるとスコアが加算、連続ヒットでコンボ加算
4. **リザルト画面**: 曲終了時にスコアとランクを表示

## プロジェクト構造

- `index.html`: タイトル画面。YouTube URL入力欄、モード選択、再生ボタンを含む。
- `game.html`: ゲーム画面。YouTubeプレイヤー、字幕、スコア表示、3Dステージを含む。
- `script.js`: ゲームロジック。動画時間に基づく字幕同期処理、1文字ずつの出力、インタラクション判定、スコア管理。
- `game-loader.js`: `game.html` ロード時に初期化を行う。
- `styles.css`: ゲーム画面用スタイル。字幕・スコア表示・UI要素。
- `index-styles.css`: タイトル画面用スタイル。入力欄・ボタン・背景演出。
- `index-scripts.js`: タイトル画面のイベント処理。URL解析・モード選択・画面遷移。
- `server.js`: Expressサーバー。

## 使用技術
- **HTML5 / CSS3 / JavaScript (ES6+)**
- **YouTube IFrame API**（動画再生と自動字幕取得）
- **Three.js**（3D演出）
- **MediaPipe Pose / Hands / Selfie Segmentation**（カメラ入力・動作検出・背景合成）

---

## トラブルシュート
- 画面が「Loading subtitles...」から進まない / エラーになる
	- `npm start` で字幕プロキシ（8080）が起動しているか確認。
	- Windowsのファイアウォールや他のアプリで 8080/8000 が塞がっていないか確認。
	- 該当動画に自動字幕（または任意の字幕）が存在しない場合は取得できません。別の動画で確認。
- CORS エラーが出る
	- 8080 のローカルプロキシを介して取得する設計です。必ずプロキシを起動してください。
- 8000番だけ起動しても動かない
	- フロントは表示されますが字幕取得に失敗します。8080のプロキシが必須です。

