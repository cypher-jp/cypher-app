// 情報源: WDC - WORLD DANCE COLOSSEUM (https://www.wdc.tokyo/)
// 東京(東急歌舞伎町タワー)で開催される国際的な2on2ストリートダンスバトル
// 「WORLD DANCE COLOSSEUM」の公式サイト。Wix製。
// 年1回開催の単発イベント運営サイトのため、取得対象はトップページ1枚のみ
// (開催日・会場・エントリー期間・料金がトップページに掲載される)。
//
// ▼ robots.txt 調査結果 (2026-07-23 時点)
//   https://www.wdc.tokyo/robots.txt は Wix自動生成。
//     User-agent: * に対しては "?lightbox=" を含むURLのみDisallow
//     (Google Ads botへの/_partials*等の制限、PetalBotの全面ブロック、
//      dotbot/AhrefsBotへのCrawl-delay 10はいずれも本Botには適用されない)
//     Sitemap: https://www.wdc.tokyo/sitemap.xml
//   本スクレイパーが使う "/"(トップページ)は許可されている。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-23 時点の実地調査)
//   - Wix製のためHTMLは大きいが、コンテンツはサーバーサイドレンダリングされており
//     開催日("2026.Oct.17th"等)・会場・エントリー情報はプレーンなHTMLテキストとして取得できる。
//   - JSON-LDのEvent型は無いため、ページ全体をテキスト化して scripts/lib/extract.ts(AI抽出)に委ねる。
//     Wixのスクリプト/スタイル/JSON設定ブロックはテキスト化前に除去する。
//   - フライヤー画像: meta[property="og:image"](キービジュアル)。
//   - 開催後〜次回発表までの期間は日付が過去日になるが、その場合はextract側でnullとなり
//     自動的にスキップされる(juste-debout-tokyo.tsと同じ方針)。
//
// ▼ マナー
//   - politeFetch: リクエスト間隔2秒以上 / UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - 1回の実行で計2リクエストのみ(robots.txt + トップページ)
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://www.wdc.tokyo";
const PAGE_URL = `${ORIGIN}/`;

/** Claudeに渡す1ページあたりの最大文字数(トークン節約)。
 *  Wixはナビゲーション等の繰り返しテキストが多いため他ソースよりやや大きめに取る */
const MAX_RAW_TEXT_LENGTH = 15000;

/** HTML全体を、改行を保ったプレーンテキストへ変換する */
function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|pre|section|article|blockquote|tr)>/gi, "\n</$1>");
  const $ = cheerio.load(withBreaks);
  $("script, style, noscript, iframe, link, meta").remove();
  return $("body")
    .text()
    .replace(/[ \t　]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const wdcTokyo: EventSource = {
  name: "wdc-tokyo",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する
    const robots = await checkRobotsTxt(ORIGIN, "/");
    if (!robots.allowed) {
      console.warn(`[wdc-tokyo] robots.txt により中止: ${robots.reason}`);
      return [];
    }

    let html: string;
    try {
      html = await fetchText(PAGE_URL);
    } catch (err) {
      console.error(
        `[wdc-tokyo] トップページ取得失敗: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
    }

    const $ = cheerio.load(html);
    const ogImage = $('meta[property="og:image"]').attr("content");
    let flyerUrl: string | undefined;
    if (ogImage) {
      try {
        flyerUrl = new URL(ogImage, PAGE_URL).toString();
      } catch {
        flyerUrl = undefined;
      }
    }

    const bodyText = htmlToText(html);
    const parts = [
      `URL: ${PAGE_URL}`,
      "サイト: WDC - WORLD DANCE COLOSSEUM 公式サイト(東京開催の国際ダンスバトル)",
      "",
      bodyText || "(本文なし)",
    ];
    const rawText = parts.join("\n").slice(0, MAX_RAW_TEXT_LENGTH);

    console.log(`[wdc-tokyo] トップページを取得(${bodyText.length}文字)`);
    return [{ sourceUrl: PAGE_URL, rawText, flyerUrl }];
  },
};
