# Lyric Stage

## プロジェクト概要
このプロジェクト「Lyric Stage」は、**YouTube動画と字幕を同期**して表示し、ユーザーが表示された歌詞にインタラクトすることでスコアを獲得する革新的なリズムゲームです。
**youtube-transcript-api + Express.js サーバーによる字幕取得**を基盤とする構成にリニューアルしました。

主要な特徴は以下の通りです。
- **字幕同期とインタラクション**: YouTube動画再生に合わせて字幕を正確なタイミングで表示。字幕は1文字ずつ進行し、ユーザーが表示された歌詞に触れる（クリック、タップ、または身体の動き）ことでスコアを獲得し、コンボを繋げます。
- **3Dライブステージの表現**: [Three.js](https://threejs.org/) を用いて、ゲームの背景にダイナミックな3Dライブステージを構築。視覚的な奥行きと臨場感を与え、ユーザーを仮想のライブ空間へと誘います。
- **カメラベースの多様なインタラクション**: [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose.html) と [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) を活用し、Webカメラを通じたユーザーの身体の動きをゲーム入力として利用。ペンライトを振るような手の動きや、全身を使ったインタラクションでプレイ可能です。

## セットアップと実行方法

### 1. ファイルの配置
本プロジェクトは、クライアントサイドのWebアプリケーションとサーバーサイドのAPIで構成されています。
すべてのファイル（`game-loader.js`, `game.html`, `index-scripts.js`, `index-styles.css`, `index.html`, `script.js`, `styles.css`, `server.js`, `package.json`）が同じディレクトリに配置されている必要があります。

### 2. 依存関係

#### クライアントサイド (Frontend)
クライアントサイドは外部ライブラリをCDN経由で読み込むため、`npm install` は不要です。必要なライブラリはHTMLファイル内で読み込まれます。

- **Three.js**: 3Dライブステージのレンダリング
  - `https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js`
- **MediaPipe Pose**: Webカメラから全身ランドマークを取得し、ボディモードでの入力に利用
  - `https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js`
- **MediaPipe Hands**: Webカメラから手のランドマークを取得し、ハンドモードでの入力に利用
  - `https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js`
- **MediaPipe Selfie Segmentation**: 人物と背景を分離し、ユーザーを3Dステージに合成
  - `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js`

#### サーバーサイド (Backend)
サーバーサイドはNode.jsで動作し、npmパッケージのインストールが必要です。

- **Express.js**: 字幕APIサーバーのフレームワーク
- **youtube-transcript-api**: YouTube動画の字幕を取得するためのライブラリ
- **cors**: クロスオリジンリソース共有 (CORS) を有効にするためのミドルウェア

### 3. 実行
プロジェクトを実行するには、まずサーバーサイドの依存関係をインストールし、サーバーを起動する必要があります。

1. **サーバーサイドの依存関係をインストール**:
   プロジェクトのルートディレクトリで以下のコマンドを実行します。
   ```bash
   npm install
   ```

2. **サーバーを起動**:
   インストールが完了したら、以下のコマンドでExpressサーバーを起動します。
   ```bash
   npm start
   ```
   または開発モード（自動リロード）で起動する場合：
   ```bash
   npm run dev
   ```
   サーバーは `http://localhost:3000` でリッスンを開始します。

3. **クライアントサイドにアクセス**:
   Webブラウザで `http://localhost:3000` にアクセスしてください。

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

### フロントエンド
- `index.html`: タイトル画面。YouTube URL入力欄、モード選択、再生ボタンを含む。
- `game.html`: ゲーム画面。YouTubeプレイヤー、字幕、スコア表示、3Dステージを含む。
- `script.js`: ゲームロジック。動画時間に基づく字幕同期処理、インタラクション判定、スコア管理。
- `game-loader.js`: `game.html` ロード時に初期化を行う。
- `styles.css`: ゲーム画面用スタイル。字幕・スコア表示・UI要素。
- `index-styles.css`: タイトル画面用スタイル。入力欄・ボタン・背景演出。
- `index-scripts.js`: タイトル画面のイベント処理。URL解析・モード選択・画面遷移。

### バックエンド
- `server.js`: Expressサーバー。字幕取得API、静的ファイル配信、エラーハンドリング。
- `package.json`: Node.jsプロジェクトの設定とサーバーサイド依存関係。

## API エンドポイント

### 字幕取得
- **エンドポイント**: `GET /captions`
- **パラメータ**: 
  - `v` (必須): YouTube動画ID
  - `lang` (オプション): 言語コード（デフォルト: `ja`）
- **レスポンス**: 字幕データの配列
- **例**: `GET /captions?v=dQw4w9WgXcQ&lang=ja`

### その他
- `GET /`: タイトル画面を表示
- `GET /health`: サーバーのヘルスチェック
- `GET /api/info`: APIエンドポイント情報

## 使用技術
- **フロントエンド**: HTML5 / CSS3 / JavaScript (ES6+)
- **バックエンド**: Node.js / Express.js
- **字幕取得**: youtube-transcript-api
- **3D演出**: Three.js
- **モーション検出**: MediaPipe (Pose / Hands / Selfie Segmentation)
- **動画再生**: YouTube IFrame Player API

## 動作環境
- **Node.js**: 16.0.0以上
- **ブラウザ**: Chrome, Firefox, Safari, Edge の最新版
- **カメラ**: ハンドモード・ボディモードを使用する場合

## トラブルシューティング

### 字幕が取得できない場合
- 動画が公開設定になっているか確認してください
- 動画に字幕が設定されているか確認してください
- 日本語字幕がない場合、自動的に英語字幕が使用されます

### カメラが動作しない場合
- ブラウザがカメラアクセスを許可しているか確認してください
- HTTPSまたはlocalhostでアクセスしていることを確認してください（MediaPipeはセキュアな接続が必要）

## ライセンス
MIT License
