# WORLD Cypher. 進捗サマリと次のタスク

**更新**: 2026-07-13 / **用途**: 今後の実装をClaude Sonnetに依頼する際の引き継ぎ資料。
まず本書を読み、詳細仕様は `docs/IMPLEMENTATION_PLAN.md`、収益戦略は `docs/MONETIZATION.md` を参照。

---

## 1. 完成済み（本番稼働中）

| 項目 | 状態 |
|------|------|
| 公開サイト | https://cypher-app-tawny.vercel.app （リブランド済み「WORLD Cypher.」、バトル特化UI） |
| 多言語 | ja(デフォルト)/en/ko/zh/fr。next-intl、`/[locale]/` ルーティング、hreflang対応 |
| DB | Supabase (project: qvzamnypgjyipyneeqgs)。schema + 003_admin + 004_scraper_i18n 適用済み |
| 管理画面 | `/admin`（Supabase Auth）。pending承認→公開、手動登録、画像アップロード |
| スクレイパー | `scripts/scrape.ts`。et-stageバトル一覧3ページ(40件上限)→Claude抽出→5言語翻訳→pending投入。フライヤー画像(og:image/一覧サムネ)とIGアカウント抽出対応 |
| 自動実行 | GitHub Actions 毎朝JST6:00（`.github/workflows/scrape.yml`、Node 22）。Secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ANTHROPIC_API_KEY 設定済み |
| 翻訳 | イベント説明文は `description_i18n` (jsonb)。表示は `src/lib/eventI18n.ts` でロケール出し分け |

### インフラ構成
GitHub (cypher-jp/cypher-app, Public) → Vercel (team: cypher-jps-projects, project: worldcypher) 自動デプロイ → Supabase。
オーナーは非エンジニア。**git CLIは使わず、GitHub Webのファイルアップロード（ドラッグ&ドロップ）で反映**する運用。`.github` 等の隠しフォルダはWeb UIの「Create new file」で作る。

### 運用ルーティン（オーナー）
毎朝 `/admin` を開き、新着pendingの内容確認（特に地域・日付）→必要なら編集→承認。

---

## 2. 次のタスク（優先順）

### T1: 地域を「地方ブロック」区分に再設計【最優先】

**背景**: 現在の `Region` は都市単位（tokyo/osaka/nagoya...）で粗く、神奈川開催が「東京」と誤分類される。et-stage側は都道府県で持っている。

**新しい区分（オーナー指定・当面はこれ）:**

| key | ラベル(ja) | 含む都道府県 |
|-----|-----------|--------------|
| hokkaido | 北海道 | 北海道 |
| tohoku | 東北 | 青森 岩手 宮城 秋田 山形 福島 |
| kanto | 関東 | 東京 神奈川 千葉 埼玉 茨城 栃木 群馬 |
| hokuriku | 北陸・甲信越 | 新潟 富山 石川 福井 山梨 長野 |
| tokai | 東海 | 愛知 岐阜 静岡 三重 |
| kansai | 関西 | 大阪 京都 兵庫 奈良 滋賀 和歌山 |
| chugoku | 中国 | 鳥取 島根 岡山 広島 山口 |
| shikoku | 四国 | 徳島 香川 愛媛 高知 |
| kyushu | 九州・沖縄 | 福岡 佐賀 長崎 熊本 大分 宮崎 鹿児島 沖縄 |
| online | オンライン | ONLINE開催 |
| korea / taiwan / asia / us / eu / other | 韓国/台湾/アジア/アメリカ/ヨーロッパ/その他 | 海外 |

**実装範囲:**
1. `src/types/event.ts` の Region 型・REGIONS・REGION_LABEL を上記に変更
2. `messages/{ja,en,ko,zh,fr}.json` の region ラベルを5言語分更新
3. FilterBar の地域セレクト（表示順は上表の順）
4. `scripts/lib/extract.ts` のプロンプト: 「会場の都道府県を読み取り、上記マッピングで地方ブロックに変換する」旨のルールを明記（都道府県→ブロックの対応表をプロンプトに含める）
5. 既存データ移行SQL `supabase/migrations/005_regions.sql`: tokyo→kanto, osaka→kansai, nagoya→tokai, fukuoka→kyushu, sapporo→hokkaido, okinawa→kyushu に update
6. **将来**: `prefecture` カラム追加で県単位フィルタに拡張予定（今回はやらない。ただしextractプロンプトで都道府県名を description に残すよう配慮）

### T2: 公開サイトの鮮度改善（小・T1と同時でよい）
- `fetchEvents` で `date >= 今日` のみ表示（過去イベントの自動非表示）
- 管理画面に「開催終了」の絞り込み

### T3: Phase 4 — Instagram 2タップ取り込み
- iOS共有シート → Make.com Webhook → Claude API（フライヤー画像→構造化+翻訳）→ Supabase pending
- リポジトリに `docs/make-scenario.md`（シナリオ構成・プロンプト・ペイロード仕様）を作成し、Make.com側の設定はオーナーがそれを見て構築
- ※Instagramの自動スクレイピングは規約違反のため実装しない（確定方針）

### T4: 記事機能＋アフィリ導線（収益化の入口）
- `/[locale]/articles` セクション（MDX or Supabaseテーブル）
- イベント詳細⇄記事の相互リンク枠
- 詳細は `docs/MONETIZATION.md` 参照（スクール送客が本命、遠征系クレカアフィリが補助）

### T5: 小物（隙間時間に）
- `public/logo.png` 配置＋Header差し替え（コード内にコメント済み）
- 独自ドメイン取得・接続（worldcypher.com 等）
- サンプルイベント（source が null で日付が過去のもの）の削除
- スクレイパー対象サイトの追加（`scripts/sources/` に1ファイル追加して `scrape.ts` の SOURCES に登録するだけの設計になっている）

---

## 3. Sonnetへの依頼方法（テンプレ）

新しいセッションで以下を伝える:

```
/Users/MARU/Documents/cypher-app-main が対象リポジトリ。
まず docs/STATUS_AND_NEXT.md を読んで全体像を把握して。
今回は T1（地域の地方ブロック再設計）を実装して。
制約: TypeScript strict・any禁止 / 新規依存の追加は事前確認 /
既存のデザイントークン(cypher-red等)踏襲 / 完了時に npm run build を通すこと。
GitHubへの反映はオーナーがWeb UIで行うので、git操作はしないこと。
変更ファイル一覧と、オーナーがやるべき手作業（SQL実行等）を最後に報告して。
```

**重要な注意（Sonnet向け）:**
- Supabaseの service role キーはサーバー/CI専用。`NEXT_PUBLIC_` に入れない・コードに書かない
- スクレイパーは robots.txt 遵守・2秒間隔・UA明記（`scripts/lib/fetch.ts` を必ず経由）
- published のレコードをスクレイパーが上書きしない設計を維持
- マイグレーションSQLはファイル作成のみ（実行はオーナーがSQL Editorで）
