// 情報源: DANCE DELIGHT (https://www.dancedelight.net/)
// 「日本最大のストリートダンスコンテスト」を運営するADHIPの公式サイト。
// JAPAN DANCE DELIGHT各地区予選のほか、BATTLE OF THE YEAR JAPAN・DANCE ATTACK!!・
// TRUE SKOOL等、系列イベントの開催情報が「EVENT GUIDE」(/event/)に継続的に掲載される。
// 単発イベントサイトではなく実質的なイベントカレンダーとして機能しているため、情報源として実装する。
//
// ▼ robots.txt 調査結果 (2026-07-23 時点)
//   https://www.dancedelight.net/robots.txt は 404(ファイル自体が存在しない)。
//   明示的な禁止規定が無いため収集可と判断する(docs/scraper-sources.md の事前調査とも一致)。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する
//   (checkRobotsTxt は404を「明示的な禁止規定なし=許可」として扱う)。
//
// ▼ サイト構造 (2026-07-23 時点の実地調査。WordPressではなく独自CMS。JSON-LDのEvent型は無し)
//   - 一覧: https://www.dancedelight.net/event/ に今後開催予定のイベントが並び、
//     ページネーションは /event/?pg=0, /event/?pg=1, /event/?pg=2 の形式(調査時点で3ページ・計十数件)。
//     詳細URLは href="/event/<数字ID>/" 形式。
//   - 詳細: /event/<id>/ のコンテンツ本体は div#pu_event_guide 内に完結している。
//       - イベント名: #pu_event_guide 内の h2(ページの<title>先頭部にも同じ名前が入る)
//       - 開催情報: table.event_detail(日付・会場・出場料等の項目が2つのテーブルに分かれて入る)
//       - フライヤー画像: #pu_event_guide 内の a[href^="/_data/image/"] > img[src*="_s."] の組。
//         アンカーのhrefがフルサイズ画像("..._1_1.jpg")、imgのsrcはサムネイル("..._1_s.jpg")。
//         フルサイズを優先し、無ければサムネイルを使う。og:imageはサイト共通ロゴのため使わない。
//     ページ左右にはショップ告知や歴代優勝者リスト等のノイズが多いため、#pu_event_guide の
//     内側だけをrawTextに使う(見つからない場合のみbody全体へフォールバック)。
//   - 日付・会場等の項目名/値はテーブルのセルテキストとして取れるが、表記ゆれがあるため
//     構造化はここでは行わず、テキスト化して scripts/lib/extract.ts(AI抽出)に委ねる。
//
// ▼ マナー
//   - politeFetch: リクエスト間隔2秒以上 / UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - 1回の実行: 一覧は SCRAPE_DANCEDELIGHT_MAX_PAGES ページまで(既定3)、
//     詳細ページは SCRAPE_DANCEDELIGHT_MAX_EVENTS 件まで(既定40。2026-07-23調査時点の掲載数は33件)
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://www.dancedelight.net";
const LIST_BASE = `${ORIGIN}/event/`;

/** 一覧を何ページまで辿るか(環境変数 SCRAPE_DANCEDELIGHT_MAX_PAGES で上書き可) */
const MAX_PAGES = parsePositiveInt(process.env.SCRAPE_DANCEDELIGHT_MAX_PAGES, 3);

/** 1回の実行で処理する詳細ページの上限(環境変数 SCRAPE_DANCEDELIGHT_MAX_EVENTS で上書き可) */
const MAX_EVENTS_PER_RUN = parsePositiveInt(
  process.env.SCRAPE_DANCEDELIGHT_MAX_EVENTS,
  40,
);

/** 詳細ページURLのパターン(数字IDのみ許可) */
const EVENT_URL_PATTERN = /^https:\/\/www\.dancedelight\.net\/event\/\d+\/$/;

/** Claudeに渡す1ページあたりの最大文字数(トークン節約) */
const MAX_RAW_TEXT_LENGTH = 12000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : NaN;
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function toAbsoluteUrl(href: string): string | null {
  try {
    return new URL(href, `${ORIGIN}/`).toString();
  } catch {
    return null;
  }
}

/** <br>タグを改行に置換してからcheerio.loadすることで、.text()取得時に改行を保持する */
function loadWithLineBreaks(html: string): ReturnType<typeof cheerio.load> {
  return cheerio.load(html.replace(/<br\s*\/?>/gi, "\n"));
}

/** 一覧ページ1枚から詳細URL(/event/<id>/)を検出順で集める */
function extractListedUrls(html: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];
  const seen = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const abs = toAbsoluteUrl(href);
    if (!abs || !EVENT_URL_PATTERN.test(abs)) return;
    if (!seen.has(abs)) {
      seen.add(abs);
      urls.push(abs);
    }
  });
  return urls;
}

interface DetailFields {
  title: string;
  contentText: string;
  flyerUrl?: string;
}

/** 詳細ページ(<br>改行置換済みcheerio)から主要フィールドを取り出す */
function extractDetailFields($: ReturnType<typeof cheerio.load>): DetailFields {
  const content = $("#pu_event_guide");
  const scope = content.length > 0 ? content : $("body");

  // イベント名: コンテンツ領域内の最初のh2。無ければ<title>の「 - DANCE DELIGHT」より前を使う
  const h2Title = scope.find("h2").first().text().trim();
  const pageTitle = $("title").text().split(" - DANCE DELIGHT")[0].trim();
  const title = h2Title || pageTitle;

  // フライヤー: a[href=/_data/image/...] > img[src*="_s."] のフルサイズ側(href)を優先
  let flyerUrl: string | undefined;
  scope.find('a[href*="/_data/image/"]').each((_, el) => {
    if (flyerUrl) return;
    const a = $(el);
    const img = a.find('img[src*="/_data/image/"]').first();
    if (img.length === 0) return;
    const full = a.attr("href");
    const thumb = img.attr("src");
    const candidate = full ?? thumb;
    if (candidate) flyerUrl = toAbsoluteUrl(candidate) ?? undefined;
  });
  if (!flyerUrl) {
    const thumb = scope.find('img[src*="/_data/image/"]').first().attr("src");
    if (thumb) flyerUrl = toAbsoluteUrl(thumb) ?? undefined;
  }

  const contentText = scope
    .text()
    .replace(/[ \t　]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, contentText, flyerUrl };
}

export const danceDelight: EventSource = {
  name: "dance-delight",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する(404=規定なしは許可扱い)
    const robots = await checkRobotsTxt(ORIGIN, "/event/");
    if (!robots.allowed) {
      console.warn(`[dance-delight] robots.txt により中止: ${robots.reason}`);
      return [];
    }

    // 一覧ページ(?pg=0..)を辿って詳細URLを集める
    const detailUrls: string[] = [];
    const seen = new Set<string>();
    for (let pg = 0; pg < MAX_PAGES; pg++) {
      const listUrl = `${LIST_BASE}?pg=${pg}`;
      let listHtml: string;
      try {
        listHtml = await fetchText(listUrl);
      } catch (err) {
        console.error(
          `[dance-delight] 一覧ページ取得失敗(${listUrl}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        break;
      }
      const urls = extractListedUrls(listHtml);
      const fresh = urls.filter((u) => !seen.has(u));
      fresh.forEach((u) => seen.add(u));
      detailUrls.push(...fresh);
      // 新しいURLが1件も無ければ最終ページを超えたと判断して打ち切る
      if (fresh.length === 0) break;
    }

    console.log(
      `[dance-delight] 一覧から ${detailUrls.length} 件の詳細URLを検出(処理上限 ${MAX_EVENTS_PER_RUN} 件)`,
    );

    // 詳細ページを取得してテキスト化
    const pages: RawEventPage[] = [];
    for (const url of detailUrls.slice(0, MAX_EVENTS_PER_RUN)) {
      try {
        const html = await fetchText(url);
        const detail = extractDetailFields(loadWithLineBreaks(html));

        const parts = [
          `URL: ${url}`,
          `イベント名: ${detail.title}`,
          "",
          detail.contentText || "(本文なし)",
        ];

        const rawText = parts.join("\n").slice(0, MAX_RAW_TEXT_LENGTH);
        pages.push({ sourceUrl: url, rawText, flyerUrl: detail.flyerUrl });
      } catch (err) {
        console.error(
          `[dance-delight] 詳細ページ取得失敗: ${url}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return pages;
  },
};
