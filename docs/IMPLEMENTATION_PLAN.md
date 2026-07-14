# WORLD Cypher. 実装指示書

**対象**: Claude Sonnet（Cursor / Cowork エージェント）による実装作業
**更新**: 2026-07-12 / Maru × Claude
**使い方**: 作業開始前にこのファイルを必ず全部読むこと。ここに書かれた運用ルールと構成が唯一の正。

---

## 1. 環境・URL（固定情報）

| 項目 | 値 |
|------|-----|
| リポジトリ | GitHub `cypher-jp/cypher-app`（main ブランチ） |
| 公開URL | https://worldcypher.vercel.app （旧: cypher-app-tawny.vercel.app） |
| Vercel | team: cypher-jps-projects。main への push で自動デプロイ |
| Supabase | project: `qvzamnypgjyipyneeqgs` |
| 管理画面 | `/admin/login`（Supabase Auth、オーナーのみ。サインアップ無効） |
| 公式IG | https://www.instagram.com/world_cypher/ |
| 技術スタック | Next.js 14 (App Router) / TypeScript strict / Tailwind / Supabase / next-intl / Vercel |

---

## 2. オーナーの運用スタイル（最重要・毎回守る）

オーナー（まる）は**非エンジニアで、ターミナルも git も使わない**。デプロイは全てブラウザ操作。

1. Sonnet はローカル（このフォルダ）でコードを完成させ、`npm run build` が通ることを確認する
2. 完了報告には**オーナーがブラウザだけで反映できる手順**を必ず付ける:
   - GitHub → Add file → Upload files にドラッグするフォルダ・ファイルの一覧
   - **ファイルを移動・削除した場合は、GitHub 上で削除すべき旧ファイルの一覧を別立てで明記**（アップロード → 削除の2段階。削除漏れはビルド失敗の最頻原因）
   - Supabase 側の作業（SQL Editor で実行するマイグレーション等）は、開くURL・コピペ手順・成功時の表示までステップ化
3. 手順は日本語で、1ステップ1操作。専門用語には一言説明を付ける
4. トラブル時はオーナーがスクショを貼るので、それを読んで対処を案内する
5. `node_modules*` で始まるフォルダ（壊れた残骸含む）と `.DS_Store` は**絶対に GitHub に上げさせない**

---

## 3. コンテキスト

- **ストリートダンスのバトル情報集約サイト「WORLD Cypher.」**（旧名 CYPHER）
- 当面**バトル特化**。DBスキーマは battle/showcase/workshop/audition/festival 全種別を保持（削らない）
- エントリー機能は持たない。**外部リンク（IG投稿 or 公式サイト）に飛ばす掲載サイト**
- 情報収集は「Webスクレイピング（自動）」＋「Instagram共有取り込み（半自動）」の2本柱。**IGの自動スクレイピングは規約違反・BANリスクのため実装しない**
- マネタイズ方針は `docs/MONETIZATION.md` 参照（記事×アフィリ、プレミアム掲載等）

---

## 4. 現在の構成（2026-07-12 時点）

```
src/
├── middleware.ts              # next-intl ロケール振り分け + /admin 保護（@supabase/ssr）
├── i18n/                      # routing.ts（ja/en/ko/zh/fr、localePrefix: always）/ request.ts / navigation.ts
├── app/
│   ├── [locale]/              # 公開側は全てロケール配下（/ja /en /ko /zh /fr）
│   │   ├── page.tsx           # ホーム（Hero + FilterBar + EventGrid、バトルがデフォルト）
│   │   ├── calendar/page.tsx
│   │   └── events/[id]/       # 詳細（generateMetadata / JSON-LD / IG embed / CTA）
│   ├── admin/                 # 管理画面（ロケール外。日本語のみでよい）
│   │   ├── login/ new/ events/[id]/edit/  actions.ts
│   ├── sitemap.ts  robots.ts  globals.css
├── components/                # Header（LocaleSwitcher含む）/ Footer / EventCard / EventGrid /
│   │                          # FilterBar / CalendarView / InstagramEmbed / admin/*
├── lib/
│   ├── supabase.ts            # 公開側クライアント（モックfallback付き）
│   ├── supabase/server.ts     # サーバー側（admin用、cookieベース）
│   ├── admin/events.ts        # 管理CRUD
│   └── eventMapper.ts ig.ts mockEvents.ts site.ts（SITE_URL/SITE_NAME）
messages/                      # ja.json en.json ko.json zh.json fr.json（UI文言のみ翻訳。イベント本文は原文）
supabase/
├── schema.sql                 # 初期スキーマ（適用済み）
├── seed.sql
└── migrations/003_admin.sql   # 管理者select権限 + flyers バケット（適用済み）
docs/
├── IMPLEMENTATION_PLAN.md     # 本書
└── MONETIZATION.md
```

### マイグレーション運用

- `supabase/migrations/` に連番で追加（**次は 004_**）。適用はオーナーが SQL Editor にコピペ実行
- 適用済み: schema.sql, 003_admin.sql

### 実装状況

| Phase | 内容 | 状態 |
|-------|------|------|
| 0 | リブランド（WORLD Cypher.）・公開設定 | ✅ 完了 |
| 1 | バトル特化UI・イベント詳細強化・SEO（sitemap/robots/JSON-LD/OGP） | ✅ 完了 |
| 2 | 管理画面（/admin、承認フロー、画像アップロード、Supabase Auth） | ✅ 完了 |
| 2.5 | 多言語（next-intl、ja/en/ko/zh/fr、hreflang） | ✅ 完了（デプロイ反映の最終確認中） |
| 3 | スクレイピング自動収集 | ⬜ 未着手（次） |
| 4 | Instagram連携（半自動取り込み） | ⬜ 未着手 |
| — | 記事機能（マネタイズ、MONETIZATION.md 参照） | ⬜ 未着手 |

---

## 5. コーディング規約（不変）

1. TypeScript strict を維持。`any` 禁止
2. 既存デザイントークン（`cypher-red` / `ink` / `paper` 等、`tailwind.config.ts`）を使う。変数名・クラス名の `cypher` は改名しない
3. Server Components 基本、インタラクション部のみ `"use client"`
4. 新規依存は本書に明記されたもののみ（Phase 3: `cheerio`、必要時 `@anthropic-ai/sdk`。JSレンダリング必須サイトのみ `playwright` 検討）
5. 完了前に必ず `npm run build` を通す
6. UI文言を追加・変更したら **5言語すべての messages/*.json を更新**する（ja だけ更新して他言語のキー欠落でビルド/表示が壊れるのが典型事故）
7. 公開側の新ページは必ず `src/app/[locale]/` 配下に置く（ロケール外に置くと404）。admin はロケール外
8. シークレット（service role キー、ANTHROPIC_API_KEY）はコード・コミットに絶対含めない。Vercel env / GitHub Secrets のみ。`NEXT_PUBLIC_` に service role を入れない

---

## 6. Phase 3: スクレイピング自動収集【次のタスク・目安3〜5日】

### 3-1. DB変更（`supabase/migrations/004_scraper.sql`）

```sql
alter table events add column if not exists source_url text;
alter table events add column if not exists updated_at timestamptz not null default now();
create unique index if not exists events_source_url_key on events (source_url) where source_url is not null;
```

`source_url` = 取得元の個別イベントページURL。**重複投入防止のキー**。

### 3-2. スクレイパー本体

```
scripts/
├── scrape.ts            # エントリーポイント（全ソース順次実行）
├── sources/
│   └── etstage.ts       # https://et-stage.net/（国内バトル情報。最優先）
└── lib/
    ├── extract.ts       # Claude API でテキスト→構造化JSON
    └── db.ts            # Supabase upsert（service role）
```

実装ルール:

1. **必ず robots.txt を確認**してから対象ページを決める。禁止パスは触らない
2. リクエスト間隔 **2秒以上**、User-Agent `WorldCypherBot/1.0 (+https://worldcypher.vercel.app)`
3. 抽出フロー: 一覧 → 個別URLリスト → 本文テキスト化 → **Claude API（claude-haiku、structured output）**で `{title, date, deadline, venue, genre, region, entry_url}` へ → バリデーション（date必須・過去日は捨てる）
4. `source_url` で upsert。新規は `status='pending'`, `source='etstage'`。**published のレコードは上書きしない**（差分はログ出力のみ）
5. 環境変数: `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY`

### 3-3. 自動実行（GitHub Actions `.github/workflows/scrape.yml`）

- `schedule: cron "0 21 * * *"`（JST朝6時）+ `workflow_dispatch`
- Node 20 → `npm ci` → `npx tsx scripts/scrape.ts`
- シークレット登録はオーナー作業 → **GitHub Settings → Secrets and variables → Actions の手順を案内すること**

### 受け入れ基準

- [ ] ローカル実行で Supabase に pending 行が入る／2回実行しても重複しない
- [ ] GitHub Actions の手動実行が成功する
- [ ] robots.txt 遵守・2秒間隔・UA明記がコードで担保されている

### 3-4. エントリーリストのスクレイピング（保留）

主催者ごとに形式がバラバラでコスパが悪いため対象外。将来は主催者提携で構造化データをもらう方向。

---

## 7. Phase 4: Instagram連携（半自動）【Phase 3の後】

1. **収集**: iOS共有シート → Make.com Webhook → Claude API（フライヤー画像→構造化）→ Supabase pending 投入。Make.com シナリオはオーナー構築、プロンプトとスキーマは `docs/make-scenario.md` に作成すること
2. **表示**: 公式embed（実装済み `InstagramEmbed.tsx`）を使用。CDN直リンク禁止
3. **運用**: @world_cypher で主催者フォロー → 告知を共有 → 翌朝 /admin で承認

---

## 8. 法務・運用上の注意（全Phase共通）

- スクレイピングは robots.txt と利用規約を遵守。拒否されたら即対象から外す
- フライヤー画像: ①IG公式embed ②主催者に掲載許可 ③許可済みのみ Storage 保存。無断のCDN直リンク禁止
- 全イベントに出典（source / ig_handle）とリンクバックを表示し「主催者への送客装置」であることを明確にする

---

## 9. 作業セッションの終わり方（毎回のチェックリスト)

- [ ] `npm run build` が通る
- [ ] 5言語の messages/*.json のキーが揃っている（UI変更時）
- [ ] 本書の「実装状況」表と構成ツリーを更新した
- [ ] オーナー向けに「アップロードするもの／GitHub上で削除するもの／Supabaseで実行するSQL／確認手順」を報告した
