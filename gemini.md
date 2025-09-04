# Lyric Stage

## プロジェクト概要
このプロジェクト「Lyric Stage」は、**YouTube動画と字幕を同期**して表示し、ユーザーが表示された歌詞にインタラクトすることでスコアを獲得する革新的なリズムゲームです。
TextAlive App API 前提の構成を廃止し、**youtube-transcript-api + Express.js サーバーによる字幕取得**を基盤とする構成にリニューアルしました。

主要な特徴は以下の通りです。
- **字幕同期とインタラクション**: YouTube動画再生に合わせて字幕を正確なタイミングで表示。字幕は1文字ずつ進行し、ユーザーが表示された歌詞に触れる（クリック、タップ、または身体の動き）ことでスコアを獲得し、コンボを繋げます。
- **3Dライブステージの表現**: [Three.js](https://threejs.org/) を用いて、ゲームの背景にダイナミックな3Dライブステージを構築。視覚的な奥行きと臨場感を与え、ユーザーを仮想のライブ空間へと誘います。
- **カメラベースの多様なインタラクション**: [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose.html) と [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) を活用し、Webカメラを通じたユーザーの身体の動きをゲーム入力として利用。ペンライトを振るような手の動きや、全身を使ったインタラクションでプレイ可能です。

## セットアップと実行方法

### 1. ファイルの配置
本プロジェクトは、クライアントサイドのWebアプリケーションとして設計されています。
以下のすべてのファイル（`game-loader.js`, `game.html`, `index-scripts.js`, `index-styles.css`, `index.html`, `script.js`, `styles.css`）をWebサーバーの公開ディレクトリに配置してください。

### 2. 依存関係
このプロジェクトは外部ライブラリをCDN経由で読み込むため、`npm install` は不要です。必要なライブラリはHTMLファイル内で読み込まれます。

- **YouTube IFrame Player API**: YouTube動画の再生制御、現在時間の取得に利用。
- `https://www.youtube.com/iframe_api`
- **Express.js（バックエンド）**: 
- **Three.js**: 3Dライブステージのレンダリング。
- `https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js`
- **MediaPipe Pose**: Webカメラから全身ランドマークを取得し、ボディモードでの入力に利用。
- `https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js`
- **MediaPipe Hands**: Webカメラから手のランドマークを取得し、ハンドモードでの入力に利用。
- `https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js`
- **MediaPipe Selfie Segmentation**: 人物と背景を分離し、ユーザーを3Dステージに合成。
- `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js`

### 3. 実行
ローカルHTTPサーバーを介して `index.html` にアクセスしてください。
例:

```bash
npm install -g http-server
http-server -p 8000
# http://localhost:8000/index.html
```

## 遊び方

1. **タイトル画面**: YouTube URL入力欄に動画URLを貼り、「再生」ボタンを押す。
2. **プレイモード選択**:
- **カーソルモード**: タップで歌詞に触れる
- **ハンドモード**: Webカメラで手を検出して操作
- **ボディモード**: Webカメラで全身を検出して操作
3. **ゲームプレイ**:
- YouTube動画が再生されると字幕が1文字ずつ表示される
- 歌詞に触れるとスコアが加算、連続ヒットでコンボ加算
- ミスするとコンボがリセット
4. **リザルト画面**: 曲終了時にスコアとランクを表示

## プロジェクト構造

- `index.html`: タイトル画面。YouTube URL入力欄、モード選択、再生ボタンを含む。
- `game.html`: ゲーム画面。YouTubeプレイヤー、字幕、スコア表示、3Dステージを含む。
- `script.js`: ゲームロジック。動画時間に基づく字幕同期処理、インタラクション判定、スコア管理。
- `game-loader.js`: `game.html` ロード時に初期化を行う。
- `styles.css`: ゲーム画面用スタイル。字幕・スコア表示・UI要素。
- `index-styles.css`: タイトル画面用スタイル。入力欄・ボタン・背景演出。
- `index-scripts.js`: タイトル画面のイベント処理。URL解析・モード選択・画面遷移。
- `server.js`: Expressサーバー。

## 使用技術
- **HTML5 / CSS3 / JavaScript (ES6+)**
- **youtube-transcript-api**（動画再生と字幕の取得）
- **Express.js**（字幕APIサーバー）
- **Three.js**（3D演出）
- **MediaPipe Pose / Hands / Selfie Segmentation**（カメラ入力・動作検出・背景合成）

---