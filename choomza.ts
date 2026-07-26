// 情報源: Choomza (https://www.choomza.com/)
// 世界中のダンスバトル/コンテスト/ワークショップを網羅する海外アグリゲーター。
// and8.dance と並ぶ大型の情報源で、日本(渋谷等)・韓国・欧州・北米のバトルが1箇所に集まる。
//
// ▼ robots.txt 調査結果 (2026-07-23 時点)
//   https://www.choomza.com/robots.txt は "User-agent: *" の1行のみで Disallow 規定なし(=全許可)。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-23 時点の実地調査。PHP製・サーバーサイドレンダリング)
//   - トップページの検索フォーム(POST "/")が唯一のフィルタUI。既定はアクセス元IPの位置基準の
//     近隣表示だが、`user_location[distance]=3`(=worldwide)+住所空でPOSTすると
//     世界中の「今後開催」イベント一覧がHTMLで返る(調査時点56件)。セッションはPHPSESSID cookie。
//   - 一覧の各イベント: a[href="/event/<slug>"](「/battle/」を含むリンクは過去バトルの結果ページなので除外)。
//   - 詳細: /event/<slug> に イベント名・日時("Fri, 24.07.2026 - 12:00 PM")・都市/国・
//     種別(battle等)・ジャンル(Breaking等)・説明・主催者Instagramリンクが載る。
//     フライヤー画像は meta og:image (= /profilepicture/event/<slug>)。
//   - POST が必要なため、この一覧取得のみ politeFetch ではなく素の fetch を使う
//     (UA明記・リクエスト間2秒以上sleepという politeFetch と同じマナーを自前で守る)。
//     詳細ページは通常のGETなので fetchText(politeFetch) を使う。
//
// ▼ 重複について
//   他ソース(the-legits-blast等)と同じイベントが別URLで入ることがあるが、
//   admin画面の重複グルーピング機能で統合する運用(既存方針どおり)。
//
// ▼ マナー
//   - 全リクエストで UA "WorldCypherBot/1.0" 明記・2秒以上の間隔
//   - 1回の実行: robots.txt + GET / + POST / + 詳細ページ最大 SCRAPE_CHOOMZA_MAX_EVENTS 件(既定40)
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText, USER_AGENT, MIN_REQUEST_INTERVAL_MS } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://www.choomza.com";

/** 1回の実行で処理する詳細ページの上限(環境変数 SCRAPE_CHOOMZA_MAX_EVENTS で上書き可) */
const MAX_EVENTS_PER_RUN = parsePositiveInt(process.env.SCRAPE_CHOOMZA_MAX_EVENTS, 40);

/** Claudeに渡す1ページあたりの最大文字数(トークン節約) */
const MAX_RAW_TEXT_LENGTH = 8000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : NaN;
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** HTMLを改行を保ったプレーンテキストへ(ナビ等の共通要素は除去) */
function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|pre|section|article|blockquote|tr)>/gi, "\n</$1>");
  const $ = cheerio.load(withBreaks);
  $("script, style, noscript, iframe, nav, header, footer").remove();
  return $("body")
    .text()
    .replace(/[ \t　]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** worldwideフィルタでの一覧HTMLを取得する(GETでcookie取得 → POSTで一覧) */
async function fetchWorldwideListHtml(): Promise<string> {
  // 1) GET / でセッションcookieを得る
  await sleep(MIN_REQUEST_INTERVAL_MS);
  const res1 = await fetch(`${ORIGIN}/`, { headers: { "User-Agent": USER_AGENT } });
  if (!res1.ok) throw new Error(`GET / failed: HTTP ${res1.status}`);
  const setCookie = res1.headers.get("set-cookie");
  const cookie = setCookie ? setCookie.split(";")[0] : "";
  await res1.text(); // ボディは読み捨て(接続を正しく解放するため)

  // 2) worldwide(distance=3)・住所空でPOST → 世界中の今後開催一覧が返る
  await sleep(MIN_REQUEST_INTERVAL_MS);
  const body = new URLSearchParams();
  body.set("user_location[address]", "");
  body.set("user_location[distance]", "3");
  const res2 = await fetch(`${ORIGIN}/`, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body.toString(),
  });
  if (!res2.ok) throw new Error(`POST / failed: HTTP ${res2.status}`);
  return res2.text();
}

/** 一覧HTMLからイベント詳細URLを検出順で集める(/battle/を含む結果ページリンクは除外) */
function extractEventUrls(html: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];
  const seen = new Set<string>();
  $("a[href^='/event/']").each((_, a) => {
    const href = $(a).attr("href");
    if (!href || href.includes("/battle/")) return;
    let abs: string;
    try {
      abs = new URL(href, `${ORIGIN}/`).toString();
    } catch {
      return;
    }
    if (!seen.has(abs)) {
      seen.add(abs);
      urls.push(abs);
    }
  });
  return urls;
}

export const choomza: EventSource = {
  name: "choomza",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する
    const robots = await checkRobotsTxt(ORIGIN, "/");
    if (!robots.allowed) {
      console.warn(`[choomza] robots.txt により中止: ${robots.reason}`);
      return [];
    }

    let listHtml: string;
    try {
      listHtml = await fetchWorldwideListHtml();
    } catch (err) {
      console.error(
        `[choomza] worldwide一覧取得失敗: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
    }

    const eventUrls = extractEventUrls(listHtml);
    console.log(
      `[choomza] worldwide一覧から ${eventUrls.length} 件の詳細URLを検出(処理上限 ${MAX_EVENTS_PER_RUN} 件)`,
    );

    const pages: RawEventPage[] = [];
    for (const url of eventUrls.slice(0, MAX_EVENTS_PER_RUN)) {
      try {
        const html = await fetchText(url);
        const $ = cheerio.load(html);
        const ogImage = $('meta[property="og:image"]').attr("content");
        let flyerUrl: string | undefined;
        if (ogImage) {
          try {
            flyerUrl = new URL(ogImage, url).toString();
          } catch {
            flyerUrl = undefined;
          }
        }

        const bodyText = htmlToText(html);
        const parts = [
          `URL: ${url}`,
          "サイト: Choomza(世界のダンスイベント情報サイト)のイベント詳細ページ",
          "備考: 日付は「24.07.2026」のようなDD.MM.YYYY(欧州式)表記。都市名の後に国名が続く。",
          "",
          bodyText || "(本文なし)",
        ];
        const rawText = parts.join("\n").slice(0, MAX_RAW_TEXT_LENGTH);
        pages.push({ sourceUrl: url, rawText, flyerUrl });
      } catch (err) {
        console.error(
          `[choomza] 詳細ページ取得失敗: ${url}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return pages;
  },
};
