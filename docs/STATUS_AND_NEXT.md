# WORLD Cypher. 進捗サマリと次のタスク

**更新**: 2026-08-23 / **用途**: 今後の実装をClaudeに依頼する際の引き継ぎ資料。
まず本書を読み、運用ルール・コーディング規約は `docs/IMPLEMENTATION_PLAN.md`、収益戦略は `docs/MONETIZATION.md`、スクレイパー対象は `docs/scraper-sources.md` を参照。

---

## 1. 完成済み(本番稼働中)

| 項目 | 状態 |
|------|------|
| 公開サイト | https://worldcypher.net (独自ドメイン接続済み。「WORLD Cypher.」バトル特化UI) |
| 多言語 | ja(デフォルト)/en/ko/zh/fr。next-intl、`/[locale]/` ルーティング、hreflang対応 |
| 公開ページ | ホーム(今後開催のみ) / events/[id] 詳細(GALLERYセクション付き) / calendar / **archive(過去イベント)** / **articles(記事)** / listing(掲載案内) / contact / privacy |
| DB | Supabase (project: qvzamnypgjyipyneeqgs)。migrations 003〜010 適用済み + MCP直接適用分(下記「DB追加変更」参照) |
| 地域区分 | 地方ブロック+都道府県+海外都市/国の階層型 Region(旧T1完了)。フィルタは国内/海外グループ表示 |
| 管理画面 | `/admin`(Supabase Auth)。pending承認→公開 / 手動登録 / フライヤー+**複数ギャラリー画像**アップロード(自動圧縮) / 検索・ジャンル・開催終了・**画像なしのみ**フィルタ / カードに**AI抽出済み詳細のダイジェスト表示** / 保存中表示+「✓ 保存しました」バナー / 記事管理(/admin/articles) / お問い合わせ一覧(/admin/contacts) |
| NEW/UPDATEDバッジ | **承認(公開)ベース**。`published_at`(初回公開時にトリガーで自動記録)から7日以内=NEW、公開後に実質更新があればUPDATED。AIバックフィルによる更新ではUPDATEDは付かない(トリガーで除外) |
| スクレイパー | 22ソース(et-stage・breaking-calendar・and8・choomza・dance-delight ほか。詳細は `docs/scraper-sources.md`)。毎朝JST6:00に GitHub Actions で自動実行 → Gemini抽出 → 5言語翻訳 → pending投入 |
| AI詳細バックフィル | `scripts/backfill-details.ts`。**source_url/entry_urlの大元ページを実際にフェッチ**して judges/djs/entry_fee/time_info 等を抽出し、空欄のみ埋める(手入力保護)。毎朝JST7:30(スクレイプ後)に自動実行。`details_backfilled_at` マーカーで再処理防止。sparseモードで再抽出も可 |
| Instagram取り込み | iOSショートカット → `/api/ingest/instagram`(自前API・Gemini抽出)→ pending投入。**Make.comは2026-08-19に置き換え済みで不要**(docs/make-scenario.md は廃止) |
| リール自動生成 | `/admin/reels`。イベント選択(新着/今週/今月/今後/過去/すべて × ジャンル × 画像ありのみ、最大10件)→ Remotion + GitHub Actions(無料)でレンダリング → Supabase Storage(reels)。デザイン2種(classic黒/light白)、1件2〜4秒、見出し/サブ見出し編集可。生成履歴から再生/DL/**「スマホに保存」(iPhone写真アプリへ)**/再生成/削除。ジョブは30分毎の定期実行で処理(即時起動は GITHUB_DISPATCH_TOKEN 未設定のため保留) |
| 記事機能 | `/[locale]/articles`(Supabase articlesテーブル+admin編集)。マネタイズ導線の枠(旧T4完了) |

### インフラ構成

GitHub (cypher-jp/cypher-app, main) → Vercel (Hobby) 自動デプロイ → Supabase。独自ドメイン worldcypher.net。
オーナーは非エンジニア。**コード反映は全てブラウザ(GitHub Web UIの編集/アップロード)**。現在はClaude(Cowork)がChromeを操作してコミットする運用。

### GitHub Actions(3本)

| workflow | スケジュール | 内容 |
|---|---|---|
| scrape.yml | 毎朝JST6:00 | 22ソースのスクレイピング→pending投入 |
| backfill-details.yml | 毎朝JST7:30 | 新着イベントの詳細をAI抽出(大元ページ参照)。手動実行でlimit/sparse指定可 |
| render-reel.yml | 30分毎+repository_dispatch | queuedなリールジョブをRemotionでレンダリング |

### DB追加変更(migrationsフォルダ外・Supabase MCPで直接適用済み)

`supabase/migrations/` は 010 まで。それ以降は以下をMCP経由で直接適用済み(SQLファイル未作成。次にファイルを作るなら 011_ から):

1. **reel_jobs** テーブル(+RLS、`reels` バケット公開読み取り) — リール生成ジョブ
2. **events.gallery_urls** text[] — ギャラリー複数画像
3. **events.details_backfilled_at** + `touch_events_updated_at()` の除外ロジック — バックフィル処理済みマーカー(UPDATEDバッジ誤発火防止)
4. **events.published_at** + `set_events_published_at()` トリガー — 初回公開日時(NEWバッジの基準。再公開でも初回日時を維持)

### 運用ルーティン(オーナー)

毎朝 `/admin` で新着pendingを確認(カードのAI抽出詳細ダイジェストで中身が見える)→必要なら編集→承認。
週1程度で `/admin/reels` からリール生成→「スマホに保存」→Instagram投稿。

### 環境変数・Secrets(設定済み)

- GitHub Actions Secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GEMINI_API_KEY / (GEMINI_MODEL) / ANTHROPIC_API_KEY
- Vercel: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / GEMINI_API_KEY / INGEST_SECRET / NEXT_PUBLIC_SITE_URL
- **注意**: Gemini無料枠の日次クォータは毎日16〜17時(JST)頃リセット。バックフィルが大量失敗したらクォータ切れを疑う(マーカーで進捗は保持されるので翌日以降自動リカバリ)

---

## 2. 残タスク(優先順)

### T1: リール即時生成(小・任意)
GITHUB_DISPATCH_TOKEN(GitHub PAT, repo dispatch権限)を作成しVercelの環境変数へ登録すると、「Generate Reel」押下で即レンダリング開始になる(現在は最大30分待ち)。**PATの発行とVercelへの貼り付けはオーナー自身が行う**(Claudeはシークレットを入力しない)。

### T2: 下書き・スカスカ詳細イベントの手入力整理(継続)
- 詳細が埋まらない一部イベント(2026-08-22時点で約77件)は大元ページ自体に情報が無いもの。adminカードの「詳細情報なし」表示が目印。急ぎのものだけ編集から手入力
- 未公開の下書きイベントの整理・再公開

### T3: Make.comアカウント削除(2026-08-26以降)
自前API置き換え(8/19)後1週間安定していれば、Makeアカウントは削除してよい。

### T4: マネタイズ施策(未着手・本丸)
記事×アフィリ枠は実装済み。中身(スクール送客・遠征系記事)は `docs/MONETIZATION.md` 参照。

### T5: 小物
- 多言語バックフィル(古いIG取り込みイベントの description_i18n 補完)
- スクレイパー対象サイトの追加(`docs/scraper-sources.md` の候補から)

---

## 3. Claudeへの依頼方法

新しいセッションで「まず docs/STATUS_AND_NEXT.md を読んで」と伝えれば全体像が入る。

**重要な注意(Claude向け):**
- オーナーは非エンジニア。git CLI不可。反映はGitHub Web UI(Claudeがブラウザ操作)
- **APIキー・シークレットをClaudeがフォームに入力しない**(オーナーが貼り付ける。Claudeは項目名の準備とSaveのみ)
- Supabaseのservice roleキーは `NEXT_PUBLIC_` に入れない・コードに書かない
- スクレイパーは robots.txt 遵守・2秒間隔・UA明記(`scripts/lib/fetch.ts` 経由必須)
- published レコードをスクレイパーが上書きしない設計を維持
- AIバックフィルは**空欄のみ**埋める(手入力保護)。`details_backfilled_at` を必ず付ける
- UI文言の追加は5言語(messages/*.json)すべて更新
- DBスキーマ変更はMCPで適用したら**本書の「DB追加変更」に必ず追記**する
