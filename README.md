# Lyric Stage - React × Hono 構成

## 完成

✅ React (TypeScript) × Hono (TypeScript) 構成完了  
✅ 既存のゲームロジックをそのまま使用して完全互換  
✅ 挙動は全く同じ

## セットアップ & 起動

```bash
npm install
npm run dev
```

- Vite: http://localhost:5176
- Hono: http://localhost:3000

## 本番ビルド

```bash
npm run build
npm start
```

## 構成

- **IndexPage**: React で曲選択UI
- **GamePage**: game.htmlにリダイレクト
- **game.html**: 既存のゲーム (script.js使用)

すべて public/ から配信され、既存コードが動作します。
