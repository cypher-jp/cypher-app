# WorldCypher 実装指示書

**対象**: Claude Sonnet（Cursor）による実装作業
**作成**: 2026-07-11 / Maru × Claude
**リポジトリ**: cypher-app（GitHub）→ Vercel（team: cypher-jps-projects）→ Supabase（project: qvzamnypgjyipyneeqgs）

---

## コンテキスト（実装前に必ず読む）

- 本アプリは**ストリートダンスのバトル情報集約サイト「WORLD Cypher.」**（旧名 CYPHER）
- 当面は**バトル特化**で運用するが、DBスキーマは battle/showcase/workshop/audition/festival 全種別を保持したまま（後で拡張するため削らない）
- エントリー機能は自社で持たない。**外部リンク（Instagram投稿 or イベント公式サイト）に飛ばす掲載サイト**として運営
- 情報収集は「Webサイトのスクレイピング（自動）」＋「Instagram共有取り込み（半自動）」の2本柱。**Instagramの自動スクレイピングは規約違反・BANリスクがあるため実装しない**
- 公式SNS: https://www.instagram.com/world_cypher/
- 技術スタック: Next.js 14 (App Router) / TypeScript / Tailwind / Supabase / Vercel

### 現状の実装済み範囲

| 領域 | 状態 |
|------|------|
| ホーム（Hero + EventGrid + FilterBar） | 実装済み |
| カレンダービュー | 実装済み |
| イベント詳細 `/events/[id]` | 実装済み |
| Supabase接続層（`src/lib/supabase.ts`、モックfallback付き） | 実装済み |
| DBスキーマ（`supabase/schema.sql`、RLS済み） | ファイルあり・適用状況要確認 |
| 管理画面・スクレイパー・画像アップロード | 未実装 |

### コーディング規約

- TypeScript strict を維持。`any` 禁止
- 既存のデザイントークン（`cypher-red` / `ink` / `paper` 等、`tailwind.config.ts` 参照）を使う
- Server Components を基本とし、インタラクションが必要な部分のみ `"use client"`
- 新規依存の追加は本書に明記されたもののみ（`cheerio`、必要なら `@anthropic-ai/sdk`）
- 各Phaseの完了時に `npm run build` が通ることを確認してからコミット

---

## Phase 0: リブランド & 公開の仕上げ【最優先・目安半日】

### 0-1. CYPHER → WORLD Cypher. への改名

対象ファイルと変更内容:

1. `src/app/layout.tsx`
   - `metadata.title`: `"WORLD Cypher. — ストリートダンスバトル情報サイト"`
   - `metadata.description`: バトル特化の文言に変更（例:「国内・海外のダンスバトル情報を、ジャンル × エリアで検索。エントリー先まで一直線。」）
   - `openGraph.title`: `"WORLD Cypher."`
   - `metadataBase` を追加（Vercel公開URL）
2. `src/components/Header.tsx`
   - ロゴを画像に差し替え: `public/logo.png` を `next/image` で表示（高さ32〜40px、alt="WORLD Cypher."）
   - **注意**: `public/logo.png` はオーナー（まる）が配置する。存在しない間はテキスト `WORLD <span class="text-cypher-red">Cypher.</span>` で表示するフォールバックにする
   - `Submit` リンク先を `https://www.instagram.com/world_cypher/` に変更（文言は「掲載依頼」or「SUBMIT」）
3. `src/components/Footer.tsx`
   - サイト名変更、Instagramリンク（@world_cypher）追加
4. `src/app/page.tsx` の Hero
   - 見出し例: `FIND YOUR NEXT BATTLE.`（CYPHERの単語はブランド名として残してよい）
   - サブコピーをバトル特化に変更
5. サイト全体を grep して残存する `CYPHER`（ブランド表記としての単独使用）を `WORLD Cypher.` に統一。ただし変数名・クラス名（`cypher-red`等）は**変更しない**

### 0-2. Vercel 側の設定（オーナーがブラウザで実施、Sonnetは手順を案内）

1. Settings → Deployment Protection → **Vercel Authentication を Disabled** にして保存（現状、公開URLがログイン画面にリダイレクトされる）
2. Settings → General → Project Name を `worldcypher` に変更 → 公開URLが `worldcypher.vercel.app` になるか確認（取られていたら `world-cypher` 等）
3. Settings → Environment Variables に以下を設定（Supabase Dashboard → Settings → API からコピー）:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://qvzamnypgjyipyneeqgs.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public キー
4. Redeploy して、公開URLで**モックではなくDBのデータ**が出ることを確認

### 0-3. Supabase 側の確認

1. SQL Editor で `supabase/schema.sql` が適用済みか確認（`events` テーブルの存在）。未適用なら実行
2. `supabase/seed.sql` を実行してテストデータ投入（既に本物のイベントを入れているならスキップ）

### Phase 0 受け入れ基準

- [ ] 公開URLがログインなしで表示される
- [ ] サイト名・OGP・ヘッダーが WORLD Cypher. になっている
- [ ] トップにSupabaseのデータが表示される（モックのタイトル「BATTLE OF TOKYO 2026」等が消えている ※seedデータと区別すること）

---

## Phase 1: バトル特化UI + イベント詳細の強化【目安1〜2日】

### 1-1. バトルをデフォルトに

- `FilterBar` / 一覧の初期状態を `type=battle` にする（URLクエリ `?type=battle` で共有可能に）
- 種別フィルタUIは残す（将来 workshop 等を出すため）。ただし表示順は BATTLE を先頭に

### 1-2. イベント詳細ページの強化（添付スクショのレイアウトを目標に）

`src/app/events/[id]/page.tsx` を以下の構成に:

1. **ヒーロー画像**: `flyerUrl` をフル幅表示（16:9 or 元比率、`next/image`）。無い場合はダークのプレースホルダー
2. **タグ列**: 種別（黒背景ピル）/ ジャンル / 地域（アウトラインピル）
3. **タイトル**: 特大見出し（display フォント）
4. **情報グリッド**: 開催日（赤字強調）/ 会場 / エントリー締切（過ぎていたら「締切済み」表示）
5. **CTAボタン（重要）**:
   - `entryUrl` があれば「ENTRY / 詳細へ →」の大ボタン（外部リンク、`target="_blank"`）
   - なければ `igPostUrl` へ「Instagramで見る」ボタン
   - 両方なければ `igHandle` のプロフィールへのリンク
   - 必ず `rel="noopener noreferrer"` を付ける
6. **Instagram埋め込み**: `igPostUrl` がある場合、公式embedを表示
   ```tsx
   // クライアントコンポーネント InstagramEmbed.tsx を新規作成
   // blockquote.instagram-media + https://www.instagram.com/embed.js を script onLoad で処理
   // window.instgrm?.Embeds.process() を script 読み込み後に呼ぶ
   ```
   ※公式embedはInstagramの規約上OK。画像の直リンク（scontent CDNのURL直貼り）は不安定かつ規約リスクがあるため**禁止**

### 1-3. SEO（集客の生命線なので必ずやる）

1. `/events/[id]` に `generateMetadata`: タイトル `【イベント名】| WORLD Cypher.`、description、OG image = flyerUrl
2. `src/app/sitemap.ts` を新規作成（全publishedイベント + 静的ページ）
3. イベント詳細に JSON-LD（`@type: "Event"`、name / startDate / location / organizer / url）を `<script type="application/ld+json">` で出力
4. `src/app/robots.ts` 追加

### Phase 1 受け入れ基準

- [ ] トップがバトル一覧で開き、フィルタで他種別にも切替可能
- [ ] 詳細ページがスクショ同等のレイアウトで、エントリー導線が外部リンクとして機能
- [ ] igPostUrl があるイベントでIG埋め込みが表示される
- [ ] `view-source:` でJSON-LDとOGPが確認できる

---

## Phase 2: 管理画面（承認フロー）【目安2〜3日】

スクレイパー（Phase 3）が入れてくる `pending` イベントを人間が確認して `published` にするためのUI。**Phase 3より先に作る**こと（先にスクレイパーを作ると承認手段がSupabaseダッシュボード直編集しかなくなる）。

### 2-1. 認証

- Supabase Auth（Email + Password、サインアップ無効化 = オーナーのみ）
- `src/middleware.ts` で `/admin` 配下を保護（`@supabase/ssr` を追加して cookie ベースで）

### 2-2. 画面構成

```
/admin
├── pending 一覧（新着順、カード形式：タイトル/日付/出典/フライヤーサムネ）
│    └── 各カード: [承認] [編集] [却下(draft化)] ボタン
├── /admin/events/[id]/edit  … 全フィールド編集フォーム
└── /admin/new               … 手動登録フォーム
```

### 2-3. 手動登録フォーム（IG共有取り込みの受け皿）

- 必須: title / type / date / region、それ以外は任意
- `igPostUrl` を貼ると `igHandle` を自動抽出
- フライヤー画像アップロード → Supabase Storage バケット `flyers`（public read / authenticated write のポリシー設定SQLも `supabase/storage.sql` として作成）

### 2-4. RLS確認

- 既存ポリシー（authenticated insert/update）で動くはず。`select` はadminでは全statusを見る必要があるため `authenticated can select all` ポリシーを追加

### Phase 2 受け入れ基準

- [ ] 未ログインで /admin にアクセスするとログイン画面
- [ ] pending → 承認 → 公開サイトに反映（ISR 5分 or revalidatePath）
- [ ] 画像アップロードとフォーム登録が動く

---

## Phase 2.5: 多言語対応（i18n）【Phase 2の後】

グローバルサイト化のため、UIを多言語展開する。

### 方針

1. ルーティング: App Router のロケールセグメント `/[locale]/` 方式。対応言語は **ja（デフォルト）/ en / ko / zh / fr** の5言語。middleware で Accept-Language による自動リダイレクト
2. ライブラリ: `next-intl` を採用（新規依存として許可）
3. 翻訳対象: UI文言（ヘッダー・フィルタ・ボタン・Hero・フッター）、GENRE_LABEL / REGION_LABEL / EVENT_TYPE_LABEL。メッセージは `messages/ja.json` / `messages/en.json` に集約
4. **イベントデータ本体（title / description）は当面翻訳しない**。タイトルは元々英語が多く、descriptionは原文のまま。将来 `description_en` カラム追加で対応
5. SEO: `hreflang` alternates を generateMetadata / sitemap に追加。言語切替UIをヘッダーに設置
6. 日付表示: ロケール対応（Intl.DateTimeFormat）

### 受け入れ基準

- [ ] `/en` で全UIが英語表示、`/ja` で日本語表示
- [ ] 言語切替がヘッダーから可能で、選択が維持される
- [ ] hreflang が両言語ページに出力される

---

## Phase 3: スクレイピング自動収集【目安3〜5日】

### 3-1. DB変更（マイグレーション `supabase/migrations/002_scraper.sql`）

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
│   ├── etstage.ts       # https://et-stage.net/ （国内バトル情報。最優先）
│   └── （追加予定: WDC、Red Bull BC One、オールドスクールナイト等）
└── lib/
    ├── extract.ts       # Claude API でテキスト→構造化JSON
    └── db.ts            # Supabase upsert（service role）
```

実装ルール:

1. 依存: `cheerio`（静的HTML用）。JSレンダリングが必要なサイトのみ `playwright` を検討
2. **必ず robots.txt を確認**してから対象ページを決める。禁止パスは触らない
3. リクエスト間隔 **2秒以上**、User-Agent に `WorldCypherBot/1.0 (+公開URL)` を明記
4. 抽出フロー: 一覧ページ → イベント個別URLリスト → 各ページ本文テキスト化 → **Claude API（claude-haiku、structured output）**で `{title, date, deadline, venue, genre, region, entry_url}` に変換 → バリデーション（date必須・過去日は捨てる）
5. `source_url` で upsert、新規は `status='pending'`, `source='etstage'`。**既に published のレコードを上書きしない**（updated_at と title/date の差分があれば pending_update 扱いにせず、ログ出力のみ）
6. 環境変数: `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY`（**service role キーはサーバー専用。NEXT_PUBLIC_ に絶対入れない**）

### 3-3. 自動実行（GitHub Actions）

`.github/workflows/scrape.yml`:

- `schedule: cron "0 21 * * *"`（JST朝6時）+ `workflow_dispatch`（手動実行）
- Node 20 → `npm ci` → `npx tsx scripts/scrape.ts`
- シークレットは GitHub Secrets に登録（オーナー作業）
- 失敗時に GitHub の通知が飛ぶことを確認

### 3-4. エントリーリストのスクレイピングについて（保留）

エントリーリストは主催者ごとに形式がバラバラ（Googleフォーム/IGコメント/専用サイト）で自動化コスパが悪い。Phase 3では**対象外**。将来、主催者と提携して構造化データをもらう方向で検討。

### Phase 3 受け入れ基準

- [ ] ローカルで `npx tsx scripts/scrape.ts` → Supabaseに pending 行が入る
- [ ] 同じスクリプトを2回実行しても重複しない
- [ ] GitHub Actions の手動実行が成功する
- [ ] robots.txt 遵守・2秒間隔・UA明記がコードで担保されている

---

## Phase 4: Instagram連携（半自動取り込み）【Phase 3の後】

1. **収集**: iOSの共有シート → Make.com Webhook → Claude API（フライヤー画像→構造化）→ Supabase に pending 投入（Make.com シナリオはオーナーが構築、プロンプトとスキーマはリポジトリ `docs/make-scenario.md` に記載）
2. **表示**: Phase 1 の公式embedを使用。プロフィールトップの自動取得はAPI制限上不可
3. **運用**: @world_cypher で主催者をフォロー→流れてきたバトル告知を共有→翌朝 /admin で承認、のデイリールーティン

---

## 法務・運用上の注意（全Phase共通）

- スクレイピングは robots.txt と各サイトの利用規約を遵守。拒否されたら即対象から外す
- フライヤー画像の転載は著作権に注意。**優先順位: ①IG公式embed ②主催者に掲載許可を取る ③許可済みのみStorageに保存**。無断のCDN直リンクはしない
- 全イベントに出典（source / ig_handle）とリンクバックを表示し「主催者への送客装置」であることを明確にする（クレーム予防＋営業資産）
- Anthropic APIキー・service roleキーは GitHub Secrets / Vercel env のみ。コードやコミットに含めない
