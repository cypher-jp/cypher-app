// 情報源: JUSTE DEBOUT TOKYO (https://www.justedebouttokyo.com/)
// 世界最大級の2on2ダンスバトル「Juste Debout」(パリ世界大会)の日本予選の公式サイト。Jimdo製。
// 年1回開催の単発イベント運営サイトのため、取得対象はトップページ1枚のみ
// (開催日・会場・OPEN/START時刻・エントリー情報がすべてトップページに掲載される)。
//
// ▼ robots.txt 調査結果 (2026-07-23 時点)
//   https://www.justedebouttokyo.com/robots.txt は
//     User-agent: *
//     Disallow: /app/
//     Disallow: /j/
//     Allow: /app/module/webproduct/goto/
//     Allow: /app/download/
//     Crawl-delay: 5
//     Sitemap: https://www.justedebouttokyo.com/sitemap.xml
//     (MJ12bot / AhrefsBot は全面ブロックだが本Botには適用されない)
//   本スクレイパーが使う "/"(トップページ)は許可されている。
//   Crawl-delay: 5 が指定されているため、このサイトへの連続リクエストは5秒以上空ける
//   (politeFetchの共通間隔は2秒なので、本ソース内で追加のsleepを入れて5秒を保証する)。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-23 時点の実地調査)
//   - Jimdo Creator製の1ページ+下層ページ構成。開催概要(日付・会場・タイムテーブル)は
//     トップページに集約されているため、トップページのみをrawTextとして返す。
//   - フライヤー画像: meta[property="og:image"](イベントキービジュアル)。
//   - 開催後〜次回発表までの期間はページ上の開催日が過去日になるが、その場合は
//     scripts/lib/extract.ts(AI抽出)側が日付なし/過去日としてnullを返し自動的にスキップされる。
//     次回開催が発表されてページが更新されると、content_hashの変化により自動的に再抽出される。
//
// ▼ マナー
//   - politeFetch: UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - リクエスト間隔: Crawl-delay指定を尊重し、このサイトへは5秒以上空ける(1回の実行で計2リクエストのみ)
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText, MIN_REQUEST_INTERVAL_MS } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://www.justedebouttokyo.com";
const PAGE_URL = `${ORIGIN}/`;

/** robots.txtのCrawl-delay指定(秒)。このサイトへの連続リクエストはこの間隔以上空ける */
const CRAWL_DELAY_MS = 5000;

/** Claudeに渡す1ページあたりの最大文字数(トークン節約) */
const MAX_RAW_TEXT_LENGTH = 12000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** HTML全体を、改行を保ったプレーンテキストへ変換する */
function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|pre|section|article|blockquote|tr)>/gi, "\n</$1>");
  const $ = cheerio.load(withBreaks);
  $("script, style, noscript, iframe").remove();
  return $("body")
    .text()
    .replace(/[ \t　]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const justeDeboutTokyo: EventSource = {
  name: "juste-debout-tokyo",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する(この中で1リクエスト目が発生する)
    const robots = await checkRobotsTxt(ORIGIN, "/");
    if (!robots.allowed) {
      console.warn(`[juste-debout-tokyo] robots.txt により中止: ${robots.reason}`);
      return [];
    }

    // Crawl-delay: 5 を尊重する。politeFetch共通の2秒に加え、差分を追加で待つ
    await sleep(Math.max(0, CRAWL_DELAY_MS - MIN_REQUEST_INTERVAL_MS));

    let html: string;
    try {
      html = await fetchText(PAGE_URL);
    } catch (err) {
      console.error(
        `[juste-debout-tokyo] トップページ取得失敗: ${
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
      "サイト: JUSTE DEBOUT TOKYO 公式サイト(世界大会「Juste Debout」の日本予選)",
      "",
      bodyText || "(本文なし)",
    ];
    const rawText = parts.join("\n").slice(0, MAX_RAW_TEXT_LENGTH);

    console.log(`[juste-debout-tokyo] トップページを取得(${bodyText.length}文字)`);
    return [{ sourceUrl: PAGE_URL, rawText, flyerUrl }];
  },
};
