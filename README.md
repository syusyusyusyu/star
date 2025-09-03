# Lyric Stage

YouTube動画と字幕を同期してインタラクションするリズムゲームです。

## 特徴

- **YouTube動画との字幕同期**: YouTube IFrame Player APIを使用
- **3Dライブステージ**: Three.jsによる3Dステージ表現
- **多様なインタラクション**: カーソル、ハンド、ボディの3つのモード
- **Express.jsサーバー**: YouTube字幕XMLを取得・JSON変換するAPIサーバー

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. サーバーの起動

```bash
npm start
```

または開発モード（nodemon使用）:

```bash
npm run dev
```

### 3. ブラウザでアクセス

```
http://localhost:3000
```

## 使い方

1. **タイトル画面**:
   - YouTube URLを入力
   - プレイモードを選択（カーソル/ハンド/ボディ）
   - 「再生」ボタンをクリック

2. **プレイモード**:
   - **カーソルモード**: マウスクリック/タップで歌詞に触れる
   - **ハンドモード**: Webカメラで手を検出して操作
   - **ボディモード**: Webカメラで全身を検出して操作

3. **ゲームプレイ**:
   - YouTube動画が再生されると字幕が1文字ずつ表示
   - 歌詞に触れるとスコア加算、連続ヒットでコンボ
   - 曲終了時にリザルト表示

## API エンドポイント

### 字幕取得API

```
GET /captions?v={videoId}&lang={language}
GET /captions/{videoId}?lang={language}
```

パラメータ:
- `videoId`: YouTubeビデオID
- `lang`: 言語コード（デフォルト: ja）

レスポンス例:
```json
{
  "videoId": "dQw4w9WgXcQ",
  "language": "ja",
  "captions": [
    {
      "start": 0.5,
      "end": 3.2,
      "duration": 2.7,
      "text": "こんにちは世界",
      "words": ["こんにちは世界"]
    }
  ],
  "count": 1
}
```

### ヘルスチェック

```
GET /health
```

## ファイル構成

- `index.html` - タイトル画面
- `game.html` - ゲーム画面
- `script.js` - メインゲームロジック（YouTube Player + Three.js）
- `server.js` - Express.jsサーバー（字幕取得API）
- `index-scripts.js` - タイトル画面の処理
- `game-loader.js` - ゲーム初期化処理
- `styles.css` - ゲーム画面のスタイル
- `index-styles.css` - タイトル画面のスタイル

## 技術スタック

### フロントエンド
- HTML5 / CSS3 / JavaScript (ES6+)
- YouTube IFrame Player API
- Three.js（3D演出）
- MediaPipe Pose/Hands/Selfie Segmentation（カメラ入力）

### バックエンド
- Node.js
- Express.js
- axios（HTTP通信）
- xml2js（XML解析）

## ブラウザサポート

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 注意事項

- カメラ機能を使用する場合はHTTPS環境が必要です
- YouTube動画に字幕がない場合はゲームをプレイできません
- モバイルデバイスではカーソルモード限定で動作します

## ライセンス

MIT License
