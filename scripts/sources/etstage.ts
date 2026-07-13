// 情報源: ENTER THE STAGE (https://et-stage.net/)
// 国内ストリートダンスバトル情報の最大手ポータル。
//
// ▼ robots.txt 調査結果 (2026-07-12 時点)
//   https://et-stage.net/robots.txt は空(実質的に存在しない)。
//   明示的なクロール禁止規定は確認できなかった。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-12 時点の実地調査)
//   - バトル一覧: /eventList.php?area_id=all&element_key=all&cate_element_key=ba
//   - イベント詳細: /event/<英数字ID>/ 形式 (例: /event/NS8xMjQ1Mw/)
//   - 詳細ページから本文テキストを抽出し、構造化はClaude API(extract.ts)に任せる
//     (セレクタ依存を最小にしてサイト改修に強くする方針)
//
// ▼ マナー
//   - politeFetch: リクエスト間隔2秒以上 / UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - 1回の実行で取得する詳細ページは MAX_EVENTS_PER_RUN 件まで
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://et-stage.net";

/** 収集対象の一覧ページ。当面はバトルカテゴリのみ */
const LIST_URLS = [
  `${ORIGIN}/eventList.php?area_id=all&element_key=all&cate_element_key=ba`,
];

/** 1回の実行で処理する詳細ページの上限(サイト負荷とAPIコストの上限) */
const MAX_EVENTS_PER_RUN = 20;

/** 詳細ページURLのパターン */
const EVENT_URL_PATTERN = /^https:\/\/et-stage\.net\/event\/[A-Za-z0-9_-]+\/?$/;

/** Claudeに渡す1ページあたりの最大文字数(トークン節約) */
const MAX_RAW_TEXT_LENGTH = 12000;

function htmlToText(html: string): { title: string; bodyText: string } {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, nav, header, footer").remove();
  const title = $("title").text().trim();
  const bodyText = $("body")
    .text()
    .replace(/[ \t　]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, bodyText };
}

export const etstage: EventSource = {
  name: "etstage",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する
    for (const path of ["/eventList.php", "/event/"]) {
      const robots = await checkRobotsTxt(ORIGIN, path);
      if (!robots.allowed) {
        console.warn(`[etstage] robots.txt により中止: ${robots.reason}`);
        return [];
      }
    }

    // 一覧ページから詳細URLを収集
    const seen = new Set<string>();
    const detailUrls: string[] = [];
    for (const listUrl of LIST_URLS) {
      const html = await fetchText(listUrl);
      const $ = cheerio.load(html);
      $('a[href*="/event/"]').each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        let abs: string;
        try {
          abs = new URL(href, ORIGIN).toString();
        } catch {
          return;
        }
        if (EVENT_URL_PATTERN.test(abs) && !seen.has(abs)) {
          seen.add(abs);
          detailUrls.push(abs);
        }
      });
    }

    console.log(
      `[etstage] 一覧から ${detailUrls.length} 件の詳細URLを検出(処理上限 ${MAX_EVENTS_PER_RUN} 件)`,
    );

    // 詳細ページを取得してテキスト化
    const pages: RawEventPage[] = [];
    for (const url of detailUrls.slice(0, MAX_EVENTS_PER_RUN)) {
      try {
        const html = await fetchText(url);
        const { title, bodyText } = htmlToText(html);
        const rawText = `URL: ${url}\nPAGE TITLE: ${title}\n\n${bodyText}`.slice(
          0,
          MAX_RAW_TEXT_LENGTH,
        );
        pages.push({ sourceUrl: url, rawText });
      } catch (err) {
        console.error(
          `[etstage] 詳細ページ取得失敗: ${url}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return pages;
  },
};
