# CYPHER

国際ダンスイベントアグリゲーター。種別 × ジャンル × エリアの3軸でフィルタできる。

## デプロイ手順

→ [`DEPLOY.md`](./DEPLOY.md) を見る。ターミナル不要、すべてブラウザのボタンクリックだけで公開できる。

## 構成

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** (デザインシステム)
- **Supabase** (PostgreSQL + RLS) ※設定するまではモックデータで動く

## ディレクトリ

```
cypher-app/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # ホーム（フィルタ＋一覧）
│   │   ├── events/[id]/      # イベント詳細
│   │   └── calendar/         # カレンダービュー
│   ├── components/           # UI部品
│   ├── lib/                  # データ層・Supabase
│   └── types/                # 型定義
├── package.json
├── tailwind.config.ts
└── DEPLOY.md                 # デプロイ手順
```
