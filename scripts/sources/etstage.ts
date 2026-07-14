// 情報源: ENTER THE STAGE (https://et-stage.net/)
// 国内ストリートダンスバトル情報の最大手ポータル。
//
// ▼ robots.txt 調査結果 (2026-07-12 時点)
//   https://et-stage.net/robots.txt は空(実質的に存在しない)。
//   明示的なクロール禁止規定は確認できなかった。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-13 時点の実地調査)
//   - バトル一覧: /eventList.php?area_id=all&element_key=all&cate_element_key=ba
//     ページネーション: &page=N (バトルは全176件・15ページ、1ページ12件)
//   - イベント詳細: /event/<英数字ID>/ 形式 (例: /event/NS8xMjQ1Mw/)
//   - フライヤー画像: 一覧のイベントリンク内 <img src="/event_image/<id>_mini.jpg">
//     詳細ページの og:image に大きい画像がある場合はそちらを優先
//   - 本文の構造化はClaude API(extract.ts)に任せる(セレクタ依存を最小にする方針)
//
// ▼ マナー
//   - politeFetch: リクエスト間隔2秒以上 / UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - 1回の実行: 一覧は SCRAPE_MAX_PAGES ページまで、詳細は SCRAPE_MAX_EVENTS 件まで
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://et-stage.net";

/** バトルカテゴリ一覧のベースURL(page パラメータを付けて使う) */
const LIST_BASE_URL = `${ORIGIN}/eventList.php?area_id=all&element_key=all&cate_element_key=ba`;

/** 一覧を何ページまで辿るか(環境変数 SCRAPE_MAX_PAGES で上書き可) */
const MAX_PAGES = parsePositiveInt(process.env.SCRAPE_MAX_PAGES, 3);

/** 1回の実行で処理する詳細ページの上限(環境変数 SCRAPE_MAX_EVENTS で上書き可) */
const MAX_EVENTS_PER_RUN = parsePositiveInt(process.env.SCRAPE_MAX_EVENTS, 40);

/** 詳細ページURLのパターン */
const EVENT_URL_PATTERN = /^https:\/\/et-stage\.net\/event\/[A-Za-z0-9_-]+\/?$/;

/** Claudeに渡す1ページあたりの最大文字数(トークン節約) */
const MAX_RAW_TEXT_LENGTH = 12000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : NaN;
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function toAbsoluteUrl(href: string): string | null {
  try {
    return new URL(href, ORIGIN).toString();
  } catch {
    return null;
  }
}

function htmlToText(html: string): {
  title: string;
  bodyText: string;
  ogImage?: string;
} {
  const $ = cheerio.load(html);
  const ogImageRaw = $('meta[property="og:image"]').attr("content");
  const ogImage = ogImageRaw ? (toAbsoluteUrl(ogImageRaw) ?? undefined) : undefined;
  $("script, style, noscript, iframe, nav, header, footer").remove();
  const title = $("title").text().trim();
  const bodyText = $("body")
    .text()
    .replace(/[ \t　]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, bodyText, ogImage };
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

    // 一覧ページ(複数ページ)から詳細URLとサムネイル画像を収集
    const seen = new Set<string>();
    const detailUrls: string[] = [];
    const thumbnailByUrl = new Map<string, string>();

    for (let page = 1; page <= MAX_PAGES; page++) {
      const listUrl = page === 1 ? LIST_BASE_URL : `${LIST_BASE_URL}&page=${page}`;
      let html: string;
      try {
        html = await fetchText(listUrl);
      } catch (err) {
        console.error(
          `[etstage] 一覧ページ取得失敗(page=${page}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        break;
      }

      const $ = cheerio.load(html);
      let foundOnThisPage = 0;

      $('a[href*="/event/"]').each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const abs = toAbsoluteUrl(href);
        if (!abs || !EVENT_URL_PATTERN.test(abs)) return;

        // リンク内のフライヤーサムネイル(<img src="/event_image/..._mini.jpg">)を拾う
        const imgSrc = $(el).find("img").attr("src");
        if (imgSrc && imgSrc.includes("/event_image/")) {
          const absImg = toAbsoluteUrl(imgSrc);
          if (absImg && !thumbnailByUrl.has(abs)) {
            thumbnailByUrl.set(abs, absImg);
          }
        }

        if (!seen.has(abs)) {
          seen.add(abs);
          detailUrls.push(abs);
          foundOnThisPage++;
        }
      });

      console.log(`[etstage] page=${page}: 新規 ${foundOnThisPage} 件`);
      // イベントリンクが1件も無ければ最終ページを超えたとみなして終了
      if (foundOnThisPage === 0) break;
      if (detailUrls.length >= MAX_EVENTS_PER_RUN) break;
    }

    console.log(
      `[etstage] 一覧から合計 ${detailUrls.length} 件の詳細URLを検出(処理上限 ${MAX_EVENTS_PER_RUN} 件)`,
    );

    // 詳細ページを取得してテキスト化＋フライヤーURL決定
    const pages: RawEventPage[] = [];
    for (const url of detailUrls.slice(0, MAX_EVENTS_PER_RUN)) {
      try {
        const html = await fetchText(url);
        const { title, bodyText, ogImage } = htmlToText(html);
        const rawText = `URL: ${url}\nPAGE TITLE: ${title}\n\n${bodyText}`.slice(
          0,
          MAX_RAW_TEXT_LENGTH,
        );

        // og:image がイベント画像ならそれを優先(大きい)、無ければ一覧のサムネイル
        const ogIsEventImage = ogImage?.includes("/event_image/") ?? false;
        const flyerUrl = ogIsEventImage ? ogImage : thumbnailByUrl.get(url);

        pages.push({ sourceUrl: url, rawText, flyerUrl });
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
