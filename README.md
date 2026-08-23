# WORLD Cypher.

世界のストリートダンスバトル情報を集約する多言語サイト → **https://worldcypher.net**

種別 × ジャンル × 地域(地方ブロック/都道府県/海外都市)でフィルタでき、5言語(ja/en/ko/zh/fr)に対応。
情報はWebスクレイピング(22ソース・毎朝自動)とInstagram共有取り込み(iOSショートカット)で収集し、管理画面で承認して公開する。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [`docs/STATUS_AND_NEXT.md`](./docs/STATUS_AND_NEXT.md) | **最新の進捗サマリと残タスク(まずこれを読む)** |
| [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) | 運用ルール・構成・コーディング規約 |
| [`docs/scraper-sources.md`](./docs/scraper-sources.md) | スクレイピング対象サイト一覧と調査記録 |
| [`docs/MONETIZATION.md`](./docs/MONETIZATION.md) | マネタイズ戦略 |
| [`DEPLOY.md`](./DEPLOY.md) | 初期構築時のデプロイ手順(記録) |

## 構成

- **Next.js 14** (App Router, TypeScript strict) + **Tailwind** + **next-intl**
- **Supabase** (PostgreSQL + Auth + Storage)
- **GitHub Actions** (スクレイピング / AI詳細抽出 / リール動画レンダリング)
- **Remotion** (Instagramリール自動生成、`remotion/`)
- **Vercel** (自動デプロイ)

## ディレクトリ

```
cypher-app/
├── src/
│   ├── app/[locale]/         # 公開ページ(ホーム/詳細/カレンダー/アーカイブ/記事 ほか)
│   ├── app/admin/            # 管理画面(承認・編集・記事・リール生成)
│   ├── app/api/              # IG取り込みAPI・画像プロキシ
│   ├── components/  lib/  types/  i18n/
├── messages/                 # UI文言 5言語
├── scripts/                  # スクレイパー・AI詳細バックフィル
├── remotion/                 # リール動画生成(独立ビルド)
├── supabase/                 # スキーマ・マイグレーション
└── .github/workflows/        # 自動実行(scrape / backfill-details / render-reel)
```
