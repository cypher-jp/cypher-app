// 「年1回開催・公式サイト1ページに開催情報が集約されている」タイプの情報源を量産するための共通ファクトリ。
// juste-debout-tokyo.ts / wdc-tokyo.ts で確立したパターン(トップページ1枚をテキスト化してAI抽出に委ねる)を
// 一般化したもの。単発大会サイトは構造がバラバラでも「ページ全文テキスト+og:image」でほぼ足りるため、
// サイトごとの個別パーサーを書かずに済ませ、保守対象を減らす。
//
// 制約(既知の割り切り):
//   - 1サイトにつき最大1イベントしか抽出されない(extractは1つのrawTextから1イベントを返す設計のため)。
//     単発大会サイトはそれで十分。複数イベントを継続掲載するサイトには使わず、個別実装すること。
//   - 開催後〜次回発表までの期間はページ上の日付が過去日になるが、その場合はextract側で
//     日付なし/過去日としてnullが返り自動的にスキップされる。次回開催の発表でページが更新されると
//     content_hashが変わり自動的に再抽出される(手動での面倒見は不要)。
//
// マナー: politeFetch(リクエスト間隔2秒以上 / UA明記 / リトライ制御)。
// robots.txtは実行のたびに再確認し、拒否されたら即中止する。
// crawlDelayMs指定時(robots.txtにCrawl-delayがあるサイト)は、そのサイトへの連続リクエスト間隔を追加sleepで保証する。
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText, MIN_REQUEST_INTERVAL_MS } from "./fetch";
import type { EventSource, RawEventPage } from "./types";

export interface SinglePageSourceConfig {
  /** DBのsourceカラムに入る識別子(例: "battle-of-the-year") */
  name: string;
  /** サイトのオリジン(例: "https://battleoftheyear.net") */
  origin: string;
  /** 取得するページのパス(既定: "/") */
  pagePath?: string;
  /** rawText先頭に載せるサイト説明(AIが文脈を掴みやすくするための1行) */
  siteLabel: string;
  /** robots.txtにCrawl-delayがある場合、そのミリ秒値(politeFetch共通の2秒との差分を追加で待つ) */
  crawlDelayMs?: number;
  /** Claudeに渡す最大文字数(既定12000) */
  maxRawTextLength?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/** 単発イベント運営サイト(1ページ完結)用のEventSourceを生成する */
export function createSinglePageSource(config: SinglePageSourceConfig): EventSource {
  const pagePath = config.pagePath ?? "/";
  const pageUrl = new URL(pagePath, `${config.origin}/`).toString();
  const maxLength = config.maxRawTextLength ?? 12000;

  return {
    name: config.name,
    enabled: true,

    async fetchRawPages(): Promise<RawEventPage[]> {
      // 実行のたびにrobots.txtを再確認する
      const robots = await checkRobotsTxt(config.origin, pagePath);
      if (!robots.allowed) {
        console.warn(`[${config.name}] robots.txt により中止: ${robots.reason}`);
        return [];
      }

      // Crawl-delay指定があるサイトは、共通間隔(2秒)との差分を追加で待って間隔を保証する
      if (config.crawlDelayMs !== undefined && config.crawlDelayMs > MIN_REQUEST_INTERVAL_MS) {
        await sleep(config.crawlDelayMs - MIN_REQUEST_INTERVAL_MS);
      }

      let html: string;
      try {
        html = await fetchText(pageUrl);
      } catch (err) {
        console.error(
          `[${config.name}] ページ取得失敗: ${
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
          flyerUrl = new URL(ogImage, pageUrl).toString();
        } catch {
          flyerUrl = undefined;
        }
      }

      const bodyText = htmlToText(html);
      const parts = [
        `URL: ${pageUrl}`,
        `サイト: ${config.siteLabel}`,
        "",
        bodyText || "(本文なし)",
      ];
      const rawText = parts.join("\n").slice(0, maxLength);

      console.log(`[${config.name}] ページを取得(${bodyText.length}文字)`);
      return [{ sourceUrl: pageUrl, rawText, flyerUrl }];
    },
  };
}
