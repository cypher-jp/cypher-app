# worldcypher-reels (Remotion)

Instagram Reels (1080×1920, 約15秒) を DB のイベント情報から自動生成するテンプレート。
サイト本体 (Next.js) とは依存関係を分離しており、Vercel のビルドには含まれない。

- `src/` … Remotion コンポジション (Opening → Events → CTA)
- `public/` … ロゴ・フォント (同梱, ネットワーク不要)
- `scripts/render.ts` … `reel_jobs` キューを処理して MP4 を Storage(reels) へ保存
- レンダリングは GitHub Actions (`.github/workflows/render-reel.yml`) で実行 (無料)

## ローカルでプレビュー
```
cd remotion && npm install
npm run studio        # ブラウザでプレビュー (sample-props.json を使用)
```
