# Instagram 2タップ取り込み — Make.com シナリオ設計書

**対象**: T3(Phase 4)。`docs/STATUS_AND_NEXT.md` 参照。
**確定方針**: Instagramの自動巡回スクレイピングは規約違反のため実装しない。
本ドキュメントは「オーナーが投稿を見つけるたびに手動で共有する」2タップ取り込みの設計のみを扱う。
実際のMake.comシナリオ構築・Anthropic/Supabaseの接続設定は、本書を見ながらオーナー自身が行う。

---

## 1. 全体フロー

```
[Instagramアプリ] イベント投稿の画像を保存 or スクショ
        ↓
[iOS 写真アプリ] 画像を選択 → 共有シート → "WorldCypherに追加"(ショートカット)
        ↓ (2タップ目: ショートカット実行)
[Apple Shortcuts] 画像(base64) + 任意メモ(音声入力可) を
                  Make.com Webhookへ POST
        ↓
[Make.com シナリオ]
  1. Webhook受信(画像 + メモ)
  2. Supabase Storage(flyersバケット)へ画像アップロード → 公開URL取得
  3. Anthropic(Claude)モジュールで画像 → 構造化JSON抽出
  4. Anthropic(Claude)モジュールで説明文 → 5言語翻訳(en/ko/zh/fr)
  5. Supabase REST(events テーブル)へ insert(status='pending')
        ↓
[管理画面 /admin] 通常フローで確認・承認
```

ポイント: **画像そのものをClaudeに読ませる**(Vision)方式にすることで、Instagram本体のAPIやスクレイピングには一切触れない。オーナーが「自分の目で見て良いと思った投稿」を手動で選んで送るので、規約上の問題が発生しない。

---

## 2. オーナー側で事前に用意するもの

| 項目 | 用途 | 入手元 |
|------|------|--------|
| Anthropic APIキー | 画像抽出・翻訳 | 既存の`ANTHROPIC_API_KEY`（GitHub Secretsと同じものを流用可） |
| Supabase Service Role Key | Storageアップロード・DB insert | 既存の`SUPABASE_SERVICE_ROLE_KEY`と同じもの。**Make.com側ではSecret/接続情報として保存し、シナリオのJSON中に平文で残さないこと** |
| Supabase Project URL | 上記と同じ接続先 | `https://qvzamnypgjyipyneeqgs.supabase.co` |
| Make.comアカウント | シナリオ実行基盤 | 無料枠で開始可（実行回数次第で有料プランへ） |
| iPhoneのShortcuts(ショートカット)アプリ | 共有シートの入口 | iOS標準アプリ |

---

## 3. iOS Shortcuts側の設計（2タップの中身）

新規ショートカット「WorldCypherに追加」を作成し、「共有シートに表示」をONにする。

**アクション構成**:
1. `共有シートの入力を受け取る`(画像 or URL) — Instagramの投稿を長押し保存した画像、またはURLどちらでも受け取れるようにしておく
2. （任意）`テキストを入力させる` — 「メモ・締切など補足があれば」を1行だけ聞く（分からなければ空欄でOKにする）
3. `URLの内容を取得`（Get Contents of URL）
   - URL: Make.comのWebhook URL(シナリオ作成時に発行される)
   - メソッド: POST
   - リクエストボディ: フォーム
     - `image`: 共有された画像ファイル
     - `note`: 手順2のテキスト（空でも可）
     - `shared_url`: 共有されたのがURLだった場合はそれも入れる（無ければ空）
4. `通知を表示` — 「送信しました」のフィードバックを出して2タップで完結させる

これで実質「Instagramで画像を保存 → 共有 → ショートカット選択」の2タップで送信が完了する。

---

## 4. Make.comシナリオのモジュール構成

### Module 1: Webhooks → Custom webhook
- Make.comで新規Webhookを作成し、URLをShortcutsに設定する
- 受け取るデータ: `image`(ファイル), `note`(文字列, 任意), `shared_url`(文字列, 任意)

### Module 2: Supabase Storage へ画像アップロード
Make.comの標準Supabaseモジュールが無い/使いにくい場合は **HTTP > Make a request** で代用する。

- URL: `{SUPABASE_URL}/storage/v1/object/flyers/{ランダムなファイル名}.jpg`
- メソッド: POST
- ヘッダー:
  - `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}`
  - `apikey: {SUPABASE_SERVICE_ROLE_KEY}`
  - `Content-Type: image/jpeg`(共有された画像の実際のMIMEに合わせる)
- ボディ: Module 1で受け取った画像バイナリ

成功後の公開URLは以下の形式になる(既存の管理画面アップロードと同じ`flyers`バケットを使うため、`src/lib/admin/events.ts`の`uploadFlyer`と同じ命名規則に合わせて `{crypto.randomUUID()}.jpg` 相当のランダム文字列を使うとよい):

```
{SUPABASE_URL}/storage/v1/object/public/flyers/{ファイル名}.jpg
```

### Module 3: Anthropic(Claude) — 画像から構造化抽出
- モデル: `claude-haiku-4-5-20251001`（既存スクレイパーと同じものを指定。コストを抑えたい場合はHaiku系で十分）
- 入力: `image`(base64) + `note`(補足メモ) をユーザーメッセージとして送る
- **system プロンプトは既存 `scripts/lib/extract.ts` の `SYSTEM_PROMPT` と同じ内容を流用する**(スキーマ・地方ブロック対応表・分類ルールが完全に一致している必要があるため。extract.tsの内容が変わったら、このシナリオのプロンプトも必ず同期して更新すること)

出力させるJSONスキーマ(extract.tsと同一):
```json
{
  "title": "string",
  "type": "battle | showcase | workshop | audition | festival",
  "genre": "hiphop | house | popping | locking | breaking | waacking | krump | jazz | all",
  "region": "hokkaido | miyagi | tohoku | tokyo | kanagawa | chiba | saitama | kanto | niigata | hokuriku | aichi | tokai | kyoto | osaka | kansai | hiroshima | chugoku | shikoku | fukuoka | kyushu | online | seoul | busan | korea | taipei | taiwan | shanghai | beijing | chengdu | asia | newyork | losangeles | us | france | paris | germany | berlin | netherlands | amsterdam | belgium | brussels | uk | london | italy | rome | spain | madrid | poland | warsaw | switzerland | zurich | russia | moscow | eu | other",
  "date": "YYYY-MM-DD",
  "deadline": "YYYY-MM-DD | null",
  "venue": "string",
  "description": "string",
  "entry_url": "string | null",
  "ig_handle": "string | null",
  "ig_url": "string | null"
}
```

画像固有の追加ルール:
- 画像内の文字(日付・会場・エントリー方法・主催者IG名など)をOCR的に読み取って埋める
- `ig_url`が空でも、共有時のメモ(`note`)や`shared_url`にInstagramのURLが含まれていればそれを使う
- 日付が西暦なしの「7/26(土)」のような表記の場合、直近の未来の該当日を採用する

### Module 4: Anthropic(Claude) — 5言語翻訳
- `scripts/lib/translate.ts` の `buildSystemPrompt()` と同じプロンプトを流用
- 入力: Module 3で得た `description`
- 出力: `{"en": "...", "ko": "...", "zh": "...", "fr": "..."}`

### Module 5: 重複チェック(任意だが推奨)
- HTTP > Make a request で `{SUPABASE_URL}/rest/v1/events?ig_post_url=eq.{URL}&select=id,status` をGET
- 既に`published`の行があれば、Module 6をスキップして通知だけ出す(スクレイパー側の「published保護」と同じ考え方)

### Module 6: Supabase REST へ insert
- URL: `{SUPABASE_URL}/rest/v1/events`
- メソッド: POST
- ヘッダー:
  - `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}`
  - `apikey: {SUPABASE_SERVICE_ROLE_KEY}`
  - `Content-Type: application/json`
  - `Prefer: return=representation`
- ボディ(`src/lib/admin/events.ts`の`toRow()`と同じ列名に合わせる):
```json
{
  "title": "{{Module3.title}}",
  "type": "{{Module3.type}}",
  "genre": "{{Module3.genre}}",
  "region": "{{Module3.region}}",
  "date": "{{Module3.date}}",
  "deadline": "{{Module3.deadline}}",
  "venue": "{{Module3.venue}}",
  "description": "{{Module3.description}}",
  "description_i18n": "{{Module4全体}}",
  "flyer_url": "{{Module2の公開URL}}",
  "ig_handle": "{{Module3.ig_handle}}",
  "ig_post_url": "{{Module3.ig_url}}",
  "entry_url": "{{Module3.entry_url}}",
  "status": "pending",
  "source": "instagram-manual"
}
```

`source`を`"instagram-manual"`のような専用の値にしておくと、管理画面の一覧で「どの経路で入ってきたか」が既存のスクレイパー経由(`etstage`等)と区別できて分かりやすい。

### Module 7: 完了通知(任意)
- Slack/LINE/Push通知等、オーナーが好きな方法で「1件登録しました」を受け取れるようにしておくと、送信ミス(Webhookが失敗した等)にすぐ気づける。

---

## 5. 既存スクレイパーとの整合性で気をつけること

- **published保護**: 既存の`upsertScrapedEvents`と同じ考え方で、`ig_post_url`が既に`published`のものと一致する場合は上書きしないこと(Module 5)
- **region対応表の同期**: `scripts/lib/extract.ts`のプロンプトを今後変更したら、このシナリオのModule 3プロンプトも必ず同じ内容に更新する。2箇所に同じルールが存在する状態なので、ズレると分類基準が食い違う
- **service role keyの管理**: Make.com側は「接続情報(Connection)」機能を使い、シナリオのBlueprint(JSONエクスポート)にキーが平文で残らないようにする。`NEXT_PUBLIC_`のような公開用キーとは別物であることを常に意識する

---

## 6. テスト手順

1. Make.comシナリオを「Run once」で手動実行できる状態にする
2. 実際にInstagramの適当な投稿画像を1枚使って、Shortcuts経由で送信
3. Make.comの実行ログで各Moduleの入出力を確認(特にModule 3のJSON抽出結果)
4. Supabaseの`events`テーブルに`status='pending'`, `source='instagram-manual'`で1行増えることを確認
5. 管理画面`/admin`で内容を確認し、問題なければ承認

---

## 7. 将来の拡張余地

- Module 3のプロンプトに「複数日程の投稿(連続开催)」を検知して複数行に分ける処理を足す
- 動画投稿(Reels)の場合はサムネイルフレームを抽出して同じ流れに乗せる
- 精度が安定してきたら、承認率の高いInstagramアカウントを`ig_handle`ベースでホワイトリスト化し、Module 5の重複チェックと組み合わせて自動承認候補として管理画面で優先表示する
