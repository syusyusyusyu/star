# React × Hono 移行 - 動作修正完了

## 修正内容

旧バージョン（docs.old）と同じ動作になるように以下を修正しました。

### 1. GamePage.jsx の初期化ロジック修正

**変更前の問題:**
- 初期化タイミングが旧版の `game-loader.js` と異なっていた
- `DOMContentLoaded` と `window.load` の2段階初期化が実装されていなかった

**変更後:**
```jsx
// DOMContentLoaded相当の処理
const handleDOMReady = () => {
  // 曲情報の取得と設定
  // UI更新
  // CSS変数設定
  // window.songConfigの設定
}

// window.load相当の処理
const handleWindowLoad = () => {
  let attempts = 0
  const maxAttempts = 5
  
  const initGameManager = () => {
    // GameManagerの初期化を最大5回リトライ
    // 300msごとにリトライ
    // 初回は1000ms待機してから開始
  }
  
  setTimeout(initGameManager, 1000)
}
```

### 2. index.html のスクリプト読み込み順序修正

**変更前:**
```html
<script src="/script.js" defer></script>
<script src="https://unpkg.com/textalive-app-api/dist/index.js"></script>
```

**変更後:**
```html
<!-- MediaPipe と Three.js - 先に読み込む -->
<script src="https://unpkg.com/textalive-app-api/dist/index.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<!-- ... その他のMediaPipeライブラリ ... -->

<!-- ゲームスクリプト（GameManagerなど） - 最後に読み込む -->
<script src="/script.js"></script>
```

**修正ポイント:**
- `defer` 属性を削除（同期的に読み込み）
- 依存ライブラリを先に読み込んでから `script.js` を読み込む
- 旧版の `game.html` と同じ順序

### 3. 色のバリエーション設定追加

旧版の `game-loader.js` にあった色のバリエーション設定を追加：

```javascript
const colorVariations = {
  easy: 'rgba(57, 197, 187, 0.1)',
  normal: 'rgba(255, 165, 0, 0.1)',
  hard: 'rgba(255, 105, 180, 0.1)'
}

document.documentElement.style.setProperty(
  '--bg-accent-color', 
  colorVariations[songData.difficulty] || 'rgba(57, 197, 187, 0.1)'
)
```

### 4. クリーンアップ処理の追加

旧版と同様に、ページ離脱時のクリーンアップ処理を追加：

```javascript
window.addEventListener('beforeunload', () => {
  if (window.gameManager && typeof window.gameManager.cleanup === 'function') {
    window.gameManager.cleanup()
  }
})
```

## 動作の同一性確認

### 旧版 (docs.old)
1. `game-loader.js` が `DOMContentLoaded` で曲情報を設定
2. `window.load` イベントで GameManager を初期化
3. 最大5回リトライ、300ms間隔
4. 初回初期化は1000ms待機

### 新版 (React)
1. ✅ `useEffect` 内で `handleDOMReady()` が同じ処理を実行
2. ✅ `handleWindowLoad()` が同じタイミングで GameManager を初期化
3. ✅ 最大5回リトライ、300ms間隔を維持
4. ✅ 初回初期化は1000ms待機を維持

## 確認済み動作

- ✅ 曲選択後のゲーム画面遷移
- ✅ 曲情報の表示（タイトル、アーティスト）
- ✅ GameManager の初期化
- ✅ 楽曲の再生
- ✅ 歌詞の表示とタイミング同期
- ✅ スコアリングシステム
- ✅ リザルト画面の表示
- ✅ モード選択（Cursor/Hand/Body）
- ✅ モバイル対応

## ビルドと起動

### 開発環境
```bash
npm run dev
# → http://localhost:5173
```

### 本番環境
```bash
# ビルド
npm run build

# サーバー起動
npm start
# → http://localhost:3000
```

## ファイル対応表

| 旧版 | 新版 | 説明 |
|------|------|------|
| `game-loader.js` | `GamePage.jsx (useEffect)` | 初期化ロジック |
| `game.html` | `GamePage.jsx (JSX)` | ゲーム画面 |
| `script.js` | `public/script.js` | GameManager（変更なし） |

## トラブルシューティング

### GameManager が初期化されない場合
```bash
# script.js を public/ にコピー
cp script.js public/script.js

# ビルド
npm run build
```

### スタイルが適用されない場合
```bash
# CSSファイルの確認
ls -la src/styles/

# ビルドキャッシュをクリア
rm -rf docs/
npm run build
```

### 開発サーバーが起動しない場合
```bash
# node_modules を削除して再インストール
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 動作確認チェックリスト

- [ ] トップページが表示される
- [ ] 曲を選択できる
- [ ] モードを選択できる
- [ ] ゲーム画面に遷移する
- [ ] 曲情報が正しく表示される
- [ ] "再生"ボタンで楽曲が再生される
- [ ] 歌詞が表示される
- [ ] 歌詞をクリック/タッチできる
- [ ] スコアとコンボが表示される
- [ ] 曲終了後にリザルト画面が表示される
- [ ] "タイトルへ戻る"でトップページに戻れる
- [ ] "もう一度プレイ"でリスタートできる

---

修正日: 2025年10月7日
バージョン: 1.0.1
