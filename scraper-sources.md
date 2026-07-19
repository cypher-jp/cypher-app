# スクレイピング対象サイト一覧

**用途**: T5(スクレイパー対象サイトの追加)の実装候補を一元管理する資料。
**最終調査**: 2026-07-15(オーナーからの候補21件 + robots.txt確認)。
**現状の実装済みソース**: `et-stage`・`breaking-calendar`(いずれも`scripts/sources/`配下に実装済み、`scripts/scrape.ts`のSOURCESに登録、毎朝JST6:00にGitHub Actionsで自動実行)。`breaking-calendar`は2026-07-20実装(robots.txt再確認済み・全許可)。本書に載っている他サイトは**まだ実装されていない**(候補段階)。

**注意**: robots.txtは各サイト運営者側の都合でいつでも変更されうる。実装に着手する直前に必ず再確認すること(`curl https://<domain>/robots.txt`で目視確認 or 既存の`scripts/lib/fetch.ts`のUA明記ルールに従う)。

---

## 1. 実装優先度：高(アグリゲーター型サイト)

多数のイベントを継続的に掲載しており、1サイト実装すれば長期間イベント供給が見込める。**次にスクレイパーを追加するならここから。**

| サイト | URL | robots.txt | メモ |
|---|---|---|---|
| ブレイキンカレンダー | https://breaking-calendar.com/ja | 🟢 全許可 | **実装済み(2026-07-20、`scripts/sources/breaking-calendar.ts`)。** Breaking特化のイベントカレンダー。日本語ページあり。トップページJSON-LD(CollectionPage)から今後開催の詳細URL一覧(既定40件)を取得し、各詳細ページのJSON-LD(Event)から タイトル/日付/会場を構造化取得 |
| AND8.DANCE | https://and8.dance/ | 🟢 全許可 | 海外最大競合と評価されているアグリゲーターサイト自体。参考にジャンル・地域バランスも意識すること(T6-4参照) |
| Dance Alive Japan | https://dancealivejapan.com/ | 🟢 全許可 | 国内ダンスイベント全般のアグリゲーター |
| TOTF (app.totf.io) | https://app.totf.io/events | 🟢 全許可 | イベント一覧アプリ。海外イベントも含む可能性あり |

---

## 2. 実装優先度：中(単発イベント運営サイト)

robots.txtは全許可だが、運営団体が年1〜数回の自社イベントのみを載せているサイト。スクレイパーを書くコスト対効果が低いため、**手動登録(admin画面)の方がROIが高い可能性がある**。まとめて実装するなら後回しでよい。

| サイト | URL | robots.txt | メモ |
|---|---|---|---|
| Freestyle Session Japan | https://freestylesessionjapan.com/ | 🟢 全許可 | |
| Undisputed Masters | https://undisputedmasters.com/ | 🟢 全許可 | |
| The Legits Blast | https://thelegitsblast.com/en/ | 🟢 全許可 | 英語サイト |
| World Breaking Classic | https://worldbreakingclassic.com/ | 🟢 全許可 | |
| Battle Of The Year | https://battleoftheyear.net/en | 🟢 全許可 | 世界的に有名な大会。英語サイト |
| World DanceSport Federation | https://www.worlddancesport.org/breaking | 🟢 全許可 | 競技ダンス公式団体。海外イベントの網羅性に寄与 |
| WDC TOKYO | https://www.wdc.tokyo/ | 🟢 全許可 | |
| forever-jp | https://www.forever-jp.com/ | 🟢 全許可 | |
| Juste Debout Tokyo | https://www.justedebouttokyo.com/ | 🟢 全許可 | 世界的に有名な大会の日本版 |
| Street Dance Camp Japan | https://www.streetdancecampjapan.com/ | 🟢 全許可 | |
| Dance Delight | https://www.dancedelight.net/ | 🟢 robots.txtファイルなし(=事実上制限なし) | |

---

## 3. 要確認(実装前にオーナー確認 or 追加調査が必要)

| サイト | URL | 状態 | 懸念点 |
|---|---|---|---|
| Tokyo Dance Life | https://www.tokyo-dancelife.com/event/ | ⚠️ robots.txt自体が403で取得不可 | クローラーへの態度が不明。実装前に手動でアクセス許可の確認が望ましい |
| Red Bull(Dance Your Style Japan) | https://www.redbull.com/jp-ja/events/dance-your-style-jp | ⚠️ 大手企業サイト | サイト利用規約でスクレイピングそのものを禁止している可能性が高い。実装前に規約確認必須 |
| Red Bull(BC One Cypher Japan) | https://www.redbull.com/jp-ja/events/red-bull-bc-one-cypher-japan | ⚠️ 同上(redbull.comドメイン) | 上と同じ懸念 |
| Freestyle Session(本家) | https://www.freestylesession.com/ | ⚠️ Shopify製サイト | イベント情報自体が薄く、商品ページ中心の可能性。実装コストに見合わない可能性 |

---

## 4. 除外(実装しない)

robots.txtでAIクローラー(ClaudeBot等)を明示的にブロックしているため、規約上スクレイピング対象から外す。

| サイト | URL | 理由 |
|---|---|---|
| B-Boy Champs | https://bboychamps.com/ | robots.txtでClaudeBotを明示的にDisallow |
| Summer Dance Forever | https://www.summerdanceforever.com/festival | robots.txtでClaudeBotを明示的にDisallow |

---

## 5. 実装方法(参考)

新しいスクレイパー対象を追加する場合の設計は既に用意されている。

1. `scripts/sources/<サイト名>.ts` を新規作成し、`EventSource`インターフェース(`scripts/lib/types.ts`参照)を実装する
2. `scripts/scrape.ts` の `SOURCES` 配列に追加登録する
3. 取得は必ず `scripts/lib/fetch.ts` 経由(robots.txt遵守・2秒間隔・UA明記のルールが共通化されている)
4. 抽出は `scripts/lib/extract.ts` の `extractEventFromText` を共通利用(地域・ジャンル分類ロジックが一元化されている)
5. 実装後は `upsertScrapedEvents`(`scripts/lib/db.ts`)経由でDBへ投入されるため、`published`済みレコードは自動的に保護される

---

## 6. 関連ドキュメント

- 全体ロードマップ: `docs/STATUS_AND_NEXT.md`(T5)
- Instagram手動連携: `docs/make-scenario.md`
- 収益化戦略: `docs/MONETIZATION.md`
