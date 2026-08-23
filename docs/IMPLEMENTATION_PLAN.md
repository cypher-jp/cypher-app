# WORLD Cypher. 実装指示書

**対象**: Claude(Cowork / エージェント)による実装作業
**更新**: 2026-08-23 / Maru × Claude
**使い方**: 作業開始前に本書と `docs/STATUS_AND_NEXT.md`(最新の進捗・残タスク)を読むこと。本書は「変わらない運用ルールと構成」、STATUS_AND_NEXT が「今の状態と次にやること」。

---

## 1. 環境・URL(固定情報)

| 項目 | 値 |
|------|-----|
| リポジトリ | GitHub `cypher-jp/cypher-app`(main ブランチ) |
| 公開URL | https://worldcypher.net (旧: worldcypher.vercel.app) |
| Vercel | team: cypher-jps-projects。main への push で自動デプロイ(Hobbyプラン) |
| Supabase | project: `qvzamnypgjyipyneeqgs` |
| 管理画面 | `/admin/login`(Supabase Auth、オーナーのみ。サインアップ無効) |
| 公式IG | https://www.instagram.com/world_cypher/ |
| 技術スタック | Next.js 14 (App Router) / TypeScript strict / Tailwind / Supabase / next-intl / Remotion / Vercel / GitHub Actions |

---

## 2. オーナーの運用スタイル(最重要・毎回守る)

オーナー(まる)は**非エンジニアで、ターミナルも git も使わない**。反映は全てブラウザ操作。
現在の標準フローは **Claude(Cowork)がChromeを操作して GitHub Web UI で編集・アップロード・コミットする**。

1. コードはローカル(作業環境)で完成させ、型チェック/ビルドが通ることを確認してから反映する
2. GitHub Web UIでの反映後、Vercelのデプロイが READY になり、`git fetch` でリモートとローカルが一致することを検証する
3. ファイルを移動・削除した場合は、GitHub 上で旧ファイルの削除も忘れない(削除漏れはビルド失敗の最頻原因)
4. Supabase のスキーマ変更は Supabase MCP(apply_migration / execute_sql)で適用し、適用内容を `docs/STATUS_AND_NEXT.md` の「DB追加変更」に記録する
5. オーナーへの報告・手順は日本語で、1ステップ1操作。専門用語には一言説明を付ける
6. `node_modules*` と `.DS_Store` は**絶対に GitHub に上げない**
7. **APIキー・シークレットをClaudeがフォームに入力しない**(オーナーが貼り付ける)。コード・コミットにも絶対含めない。`NEXT_PUBLIC_` に service role を入れない

---

## 3. コンテキスト

- **ストリートダンスのバトル情報集約サイト「WORLD Cypher.」**(旧名 CYPHER)
- 当面**バトル特化**。DBスキーマは battle/showcase/workshop/audition/festival 全種別を保持(削らない)
- エントリー機能は持たない。**外部リンク(IG投稿 or 公式サイト)に飛ばす掲載サイト**
- 情報収集は「Webスクレイピング(自動・22ソース)」+「Instagram共有取り込み(iOSショートカット→自前API)」の2本柱。**IGの自動スクレイピングは規約違反・BANリスクのため実装しない**
- マネタイズ方針は `docs/MONETIZATION.md` 参照(記事×アフィリ、スクール送客が本命)

---

## 4. 現在の構成(2026-08-23 時点)

```
src/
├── middleware.ts              # next-intl ロケール振り分け + /admin 保護(@supabase/ssr)
├── i18n/                      # routing.ts(ja/en/ko/zh/fr、localePrefix: always)/ request.ts / navigation.ts
├── app/
│   ├── [locale]/              # 公開側は全てロケール配下
│   │   ├── page.tsx           # ホーム(Hero + FilterBar + EventGrid。今後開催のみ)
│   │   ├── calendar/  archive/  articles/([slug])  listing/  contact/  privacy/
│   │   └── events/[id]/       # 詳細(generateMetadata / JSON-LD / GALLERY / IG embed / CTA)
│   ├── admin/                 # 管理画面(ロケール外・日本語のみ)
│   │   ├── login/ new/ events/[id]/edit/ articles/ contacts/ reels/ actions.ts
│   ├── api/
│   │   ├── ingest/instagram/  # iOSショートカットからのIG取り込みAPI(Gemini抽出、INGEST_SECRET認証)
│   │   └── flyer-proxy/       # 外部フライヤー画像のプロキシ
│   ├── sitemap.ts  robots.ts  globals.css
├── components/                # Header / Footer / EventCard(NEW/UPDATEDバッジ) / EventGrid / FilterBar /
│   │                          # CalendarView / InstagramEmbed / admin/*(EventForm, AdminEventDetails,
│   │                          # ReelEventPicker, ShareReelButton ほか)
├── lib/
│   ├── supabase.ts  supabase/server.ts
│   ├── admin/events.ts  admin/reels.ts  # 管理CRUD / リールジョブ管理
│   └── eventMapper.ts  eventI18n.ts  ig.ts  site.ts
messages/                      # ja en ko zh fr(UI文言。イベント本文は description_i18n で翻訳)
scripts/                       # スクレイパー(scrape.ts + sources/ 22ソース + lib/)、
│                              # backfill-details.ts(AI詳細バックフィル)
remotion/                      # リール動画生成(独立tsconfig。1080x1920、classic/lightテンプレート)
supabase/migrations/           # 003〜010(011以降はMCP直接適用 → STATUS_AND_NEXT参照)
.github/workflows/             # scrape.yml(JST6:00) / backfill-details.yml(JST7:30) / render-reel.yml(30分毎)
docs/                          # 本書 / STATUS_AND_NEXT / MONETIZATION / scraper-sources / make-scenario(廃止)
```

### マイグレーション運用

- 現在はSupabase MCPで直接適用し、内容を `docs/STATUS_AND_NEXT.md` に記録する運用。SQLファイルを作る場合は `supabase/migrations/` に連番(次は 011_)
- 適用済み: schema.sql、003〜010、+MCP適用4件(reel_jobs / gallery_urls / details_backfilled_at / published_at)

### 実装状況

| Phase | 内容 | 状態 |
|-------|------|------|
| 0 | リブランド(WORLD Cypher.)・公開設定 | ✅ 完了 |
| 1 | バトル特化UI・イベント詳細強化・SEO(sitemap/robots/JSON-LD/OGP) | ✅ 完了 |
| 2 | 管理画面(/admin、承認フロー、画像アップロード、Supabase Auth) | ✅ 完了 |
| 2.5 | 多言語(next-intl、ja/en/ko/zh/fr、hreflang) | ✅ 完了 |
| 3 | スクレイピング自動収集(22ソース・毎朝JST6:00) | ✅ 完了 |
| 3.5 | AI詳細バックフィル(大元ページ参照・毎朝JST7:30) | ✅ 完了 |
| 4 | Instagram連携(iOSショートカット→自前API。Make.comは廃止) | ✅ 完了 |
| 5 | 地域の地方ブロック+都道府県再設計 | ✅ 完了 |
| 6 | 記事機能・掲載案内・お問い合わせ | ✅ 完了 |
| 7 | リール自動生成(Remotion + GitHub Actions + /admin/reels) | ✅ 完了 |
| — | マネタイズ施策の中身(スクール送客・アフィリ記事) | ⬜ 未着手(MONETIZATION.md 参照) |

---

## 5. コーディング規約(不変)

1. TypeScript strict を維持。`any` 禁止
2. 既存デザイントークン(`cypher-red` / `ink` / `paper` 等、`tailwind.config.ts`)を使う。変数名・クラス名の `cypher` は改名しない
3. Server Components 基本、インタラクション部のみ `"use client"`
4. 新規依存の追加は事前確認(現在の主要依存: cheerio / @supabase/supabase-js / next-intl / remotion。remotion はルートtsconfig外)
5. 完了前に必ず型チェック・ビルドを通す
6. UI文言を追加・変更したら **5言語すべての messages/*.json を更新**する
7. 公開側の新ページは必ず `src/app/[locale]/` 配下に置く。admin・api はロケール外
8. シークレットはコード・コミットに絶対含めない。Vercel env / GitHub Secrets のみ
9. スクレイパーは robots.txt 遵守・2秒間隔・UA明記(`scripts/lib/fetch.ts` を必ず経由)
10. published のレコードをスクレイパーが上書きしない設計を維持。AIバックフィルは空欄のみ埋める(手入力保護)

---

## 6. 法務・運用上の注意(全Phase共通)

- スクレイピングは robots.txt と利用規約を遵守。拒否されたら即対象から外す
- フライヤー画像: ①IG公式embed ②主催者に掲載許可 ③許可済みのみ Storage 保存。無断のCDN直リンク禁止
- 全イベントに出典(source / ig_handle)とリンクバックを表示し「主催者への送客装置」であることを明確にする

---

## 7. 作業セッションの終わり方(毎回のチェックリスト)

- [ ] 型チェック/ビルドが通り、Vercelデプロイが READY
- [ ] 5言語の messages/*.json のキーが揃っている(UI変更時)
- [ ] DBスキーマを変更した場合、STATUS_AND_NEXT の「DB追加変更」に追記した
- [ ] `docs/STATUS_AND_NEXT.md` の進捗・残タスクを更新した
- [ ] オーナー向けに「何が変わったか/確認手順/オーナーがやること」を日本語で報告した
