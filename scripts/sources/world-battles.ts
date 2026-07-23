// 情報源: 世界の主要バトル・フェスティバル(単発イベント運営サイト)10件をまとめて定義するモジュール。
// いずれも「年1回前後の自社イベントのみを載せる公式サイト」であり、開催情報はトップページ1枚に
// 集約されているため、scripts/lib/single-page-source.ts の共通ファクトリで実装する
// (1サイト=1リクエスト+robots.txt確認のみ。個別のHTMLパーサーは持たない)。
//
// ▼ robots.txt 調査結果 (2026-07-23 時点。いずれも実行のたびにcheckRobotsTxt()で再確認される)
//   - battleoftheyear.net      … /api/ と /slice-simulator のみDisallow。トップページは許可
//   - thelegitsblast.com       … WordPress標準(/wp-admin/のみDisallow)。許可
//   - worldbreakingclassic.com … /admin のみDisallow。許可
//   - undisputedmasters.com    … WordPress標準(/wp-admin/のみDisallow)。許可
//   - thenotoriousibe.com      … WordPress標準(/wp-admin/のみDisallow)。許可
//   - streetstar.se            … Disallowなし(全許可)
//   - sdkeurope.com            … WordPress標準(/wp-admin/のみDisallow)。許可
//   - joatfestival.com         … Disallowなし(全許可)
//   - kod-keepondancing.com    … Wix自動生成(?lightbox= URLのみDisallow。PetalBot等の他Bot制限は本Botに非適用)。許可
//   - juste-debout.com         … WordPress標準(/wp-admin/と/wp-content/uploads/wpforms/のみDisallow)。許可
//
// ▼ 割り切り(single-page-source.tsの制約と同じ)
//   - 各サイト最大1イベントのみ抽出される。開催後は過去日となりextract側で自動スキップ、
//     次回開催の発表(ページ更新)でcontent_hashが変わり自動再抽出される。
//   - Red Bull系(redbull.com)は利用規約でスクレイピング禁止の可能性が高いため実装しない。
//   - bboychamps.com / summerdanceforever.com はrobots.txtでClaudeBotを明示ブロックしているため
//     従来方針どおり実装しない(docs/scraper-sources.md 参照)。
import { createSinglePageSource } from "../lib/single-page-source";
import type { EventSource } from "../lib/types";

/** 世界の主要バトル・フェスティバル(単発サイト)群。scrape.tsのSOURCESへはこの配列ごと展開して登録する */
export const worldBattleSources: EventSource[] = [
  createSinglePageSource({
    name: "battle-of-the-year",
    origin: "https://battleoftheyear.net",
    pagePath: "/en",
    siteLabel:
      "BATTLE OF THE YEAR 公式サイト(世界最大級のBreakingクルーバトル。世界各国予選と世界大会)",
  }),
  createSinglePageSource({
    name: "the-legits-blast",
    origin: "https://thelegitsblast.com",
    pagePath: "/en/",
    siteLabel:
      "The Legits Blast 公式サイト(スロバキア・Banska Bystricaで開催されるBreakingフェスティバル/Outbreak Europe系列)",
  }),
  // World Breaking Classic (worldbreakingclassic.com) は2026-07-23の実地テストで
  // 本文がJavaScript描画のためHTML取得では0文字だった。サーバーサイドで本文が取れないため見送り
  // (robots.txt自体は許可。サイトがSSR化されたら createSinglePageSource で追加できる)。
  createSinglePageSource({
    name: "undisputed-masters",
    origin: "https://undisputedmasters.com",
    siteLabel: "Undisputed Masters 公式サイト(世界トップBboy/Bgirlが集うBreaking大会)",
  }),
  createSinglePageSource({
    name: "notorious-ibe",
    origin: "https://www.thenotoriousibe.com",
    siteLabel:
      "The Notorious IBE 公式サイト(オランダで開催される世界最大級のBreakingフェスティバル)",
  }),
  createSinglePageSource({
    name: "streetstar",
    origin: "https://streetstar.se",
    siteLabel:
      "STREETSTAR 公式サイト(スウェーデン・ストックホルムで開催されるストリートダンスフェスティバル)",
  }),
  createSinglePageSource({
    name: "sdk-europe",
    origin: "https://www.sdkeurope.com",
    siteLabel:
      "SDK.EUROPE 公式サイト(チェコで開催されるヨーロッパ最大級のストリートダンスフェスティバル)",
  }),
  createSinglePageSource({
    name: "joat-festival",
    origin: "https://joatfestival.com",
    pagePath: "/en/",
    siteLabel:
      "JOAT International Street Dance Festival 公式サイト(カナダ・モントリオールのストリートダンスフェスティバル)",
  }),
  createSinglePageSource({
    name: "kod-keepondancing",
    origin: "https://www.kod-keepondancing.com",
    siteLabel:
      "KOD (Keep On Dancing) 公式サイト(中国発の世界的ストリートダンスバトル大会)",
  }),
  createSinglePageSource({
    name: "juste-debout-world",
    origin: "https://juste-debout.com",
    pagePath: "/en/home-page-en/",
    siteLabel:
      "Juste Debout 公式サイト(パリで世界大会が開催される世界最大の2on2ダンスバトル。各国予選ツアーあり)",
  }),
];
