// 情報源: and8.dance (https://and8.dance/)
// ドイツ(cc7 GmbH運営)発、海外最大級のストリートダンス(ブレイキン/ヒップホップ等)イベント集約ポータル。
// バトル・フェス・キャンプ・ワークショップ等、世界中の開催情報を多言語(独/英/日含む10言語)で提供している。
//
// ▼ robots.txt 調査結果 (2026-07-20 時点)
//   https://and8.dance/robots.txt は
//     User-agent: *
//     Disallow: (空 = 全許可)
//   明示的なクロール禁止規定は無い。念のため実行のたびに checkRobotsTxt() で再確認し、
//   拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-20 時点の実地調査。JSON-LD/__NEXT_DATA__は存在しないプレーンSSR HTML)
//   - 一覧: https://and8.dance/de/events (ドイツ語版を使用。言語が違っても構造・URLは共通)
//     <table class="d_tab"> 内に開催日時系列(今後開催分のみ、2027年分まで)の全件が1ページに埋め込まれている。
//       - <tr class="d_hl"><h2>月名 年</h2></tr> … 月の区切り見出し。「Juli 2026」のように
//         当年以外は必ず西暦4桁を明記するが、直近の「heute/morgen/nächste Woche」の相対見出しには年が無い。
//       - <tr class="d_list"><td class="dateRange">開催日(範囲・当年は年省略)</td>
//         <td><a href="de/e/<id>">タイトル</a> (種別ラベル)</td><td>国旗+会場</td></tr>
//     dateRange列は当年の場合「13.  - 26. Jul」のように年を含まないため、直前に見た月見出しの年
//     (見出しが無い最初の相対見出し区間はスクレイパー実行時点の西暦)をこちらで補って
//     detail側のrawTextに明記する(Claudeの日付抽出が年を誤らないようにするため)。
//   - 詳細: /de/e/<id> のHTMLもJSON-LD無し。以下をcheerioで拾う。
//       - h1 … タイトル / #event_subtitle … サブタイトル
//       - .event_date … 開催日(範囲・年なし) / .event_location … 会場名+住所(ワークショップ会場が別途あれば併記)
//       - h2「Veranstalter」の次のdiv.einespalte … 主催者名/電話/メール/Webサイト/Instagram
//       - .markdown … 本文(「Details zur Veranstaltung」の全文。プログラム/カテゴリ/賞金/エントリー方法等を含む)
//       - img.event_banner_dummy (= og:image と同じcdn.and8.dance/gfx/banner/...) … フライヤー画像
//   - フライヤー画像: 上記banner画像をflyerUrlとして採用。
//   - Instagram/Webサイト: ページ内の instagram.com リンクおよび主催者WebサイトリンクをrawTextへ追記する。
//     シェアボタン(Facebook/Twitter/WhatsApp/mailto)・Google Mapsリンク・and8.dance内部リンクは除外する。
//     entry_url/ig_handle等の最終判定はextract.ts(Claude)に任せる。
//
// ▼ マナー
//   - politeFetch: リクエスト間隔2秒以上 / UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - 1回の実行: 詳細ページは SCRAPE_AND8_MAX_EVENTS 件まで(既定40)。海外最大級のアグリゲーターであり
//     大量アクセスは避けたいため、既定件数を超えて増やす場合は運営側の合意を取ってから行うこと。
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://and8.dance";
const LIST_URL = `${ORIGIN}/de/events`;

/** 1回の実行で処理する詳細ページの上限(環境変数 SCRAPE_AND8_MAX_EVENTS で上書き可) */
const MAX_EVENTS_PER_RUN = parsePositiveInt(process.env.SCRAPE_AND8_MAX_EVENTS, 40);

/** 詳細ページURLのパターン */
const EVENT_URL_PATTERN = /^https:\/\/and8\.dance\/de\/e\/\d+\/?$/;

/** シェアボタン・地図・内部リンク等、イベント本体の情報ではないリンクを除外するための判定 */
const NON_CONTENT_LINK_PATTERN =
  /^https?:\/\/(www\.)?(twitter\.com|x\.com|facebook\.com\/sharer|google\.com\/maps|instagram\.com\/and8_dance\/?$)/;

/** Claudeに渡す1ページあたりの最大文字数(トークン節約) */
const MAX_RAW_TEXT_LENGTH = 12000;

/** 月見出し(d_hl)から西暦4桁を拾う正規表現 */
const YEAR_IN_HEADING_PATTERN = /\b(20\d{2})\b/;

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

interface ListedEvent {
  url: string;
  /** 一覧の dateRange 列テキスト(例: "13.  - 26. Jul"、当年以外は年込み) */
  dateRangeText: string;
  /** 直前の月見出しから補完した西暦(4桁)。当年扱いの区間ではスクレイパー実行時点の年 */
  yearHint: number;
  title: string;
  /** 一覧の種別ラベル(例: "Battle" "Workshop" "Camp" 等) */
  typeLabel: string;
  venueText: string;
}

/** 一覧ページ(table.d_tab)を上から順に走査し、月見出しの年を引き継ぎながらイベント行を集める */
function extractListedEvents($: ReturnType<typeof cheerio.load>): ListedEvent[] {
  const events: ListedEvent[] = [];
  let currentYear = new Date().getFullYear();

  // table.d_tab は「フィルターUI」と「日付一覧」の2つが同じクラスで存在するため、
  // tr.d_list(イベント行)を含む方を選ぶ
  const $eventTable = $("table.d_tab")
    .filter((_, el) => $(el).find("tr.d_list").length > 0)
    .first();

  $eventTable.find("tr").each((_, row) => {
    const $row = $(row);

    if ($row.hasClass("d_hl")) {
      const headingText = $row.find("h2").text();
      const match = headingText.match(YEAR_IN_HEADING_PATTERN);
      if (match) {
        currentYear = Number.parseInt(match[1], 10);
      }
      return;
    }

    if (!$row.hasClass("d_list")) return;

    const cells = $row.find("td");
    if (cells.length < 3) return;

    const dateRangeText = $(cells[0]).text().replace(/\s+/g, " ").trim();
    const link = $(cells[1]).find("a").first();
    const href = link.attr("href");
    if (!href) return;
    const abs = toAbsoluteUrl(href);
    if (!abs || !EVENT_URL_PATTERN.test(abs)) return;

    const title = link.text().trim();
    const typeMatch = $(cells[1]).text().match(/\(([^)]+)\)\s*$/);
    const typeLabel = typeMatch ? typeMatch[1].trim() : "";
    const venueText = $(cells[2]).text().replace(/\s+/g, " ").trim();

    events.push({ url: abs, dateRangeText, yearHint: currentYear, title, typeLabel, venueText });
  });

  return events;
}

interface DetailFields {
  title: string;
  subtitle?: string;
  eventDateText?: string;
  venueText?: string;
  organizerText?: string;
  bodyText: string;
  bannerImage?: string;
  links: string[];
}

/** 詳細ページ(cheerio)から主要フィールドを取り出す */
function extractDetailFields($: ReturnType<typeof cheerio.load>): DetailFields {
  const title = $("h1").first().text().trim() || $("title").text().trim();
  const subtitle = $("#event_subtitle").first().text().trim() || undefined;
  const eventDateText =
    $(".event_date").first().text().replace(/\s+/g, " ").trim() || undefined;
  const venueText =
    $(".event_location").first().text().replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim() ||
    undefined;

  // h2「Veranstalter(主催者)」の直後の div.einespalte に主催者情報がある
  const organizerHeading = $("h2")
    .filter((_, el) => $(el).text().trim() === "Veranstalter")
    .first();
  const organizerText = organizerHeading.length
    ? organizerHeading
        .nextAll("div.einespalte")
        .first()
        .text()
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim() || undefined
    : undefined;

  const bodyText =
    $(".markdown")
      .first()
      .text()
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim() || "";

  const ogImageRaw = $('meta[property="og:image"]').attr("content");
  const bannerImage = ogImageRaw ? (toAbsoluteUrl(ogImageRaw) ?? undefined) : undefined;

  const links: string[] = [];
  const seen = new Set<string>();
  $('a[href*="instagram.com"], .einespalte a[target="_blank"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (NON_CONTENT_LINK_PATTERN.test(href)) return;
    if (href.includes("google.com/maps")) return;
    // ページ内相対リンク(例: "../e/5593")は絶対URLへ解決してからノイズ判定・重複排除する
    const abs = toAbsoluteUrl(href) ?? href;
    // 「関連イベント」等、自サイト内の他イベントへのリンク(/e/<id> または /<lang>/e/<id>)は対象外
    if (/^https:\/\/and8\.dance\/(?:[a-z]{2}\/)?e\/\d+\/?$/.test(abs)) return;
    if (!seen.has(abs)) {
      seen.add(abs);
      links.push(abs);
    }
  });

  return { title, subtitle, eventDateText, venueText, organizerText, bodyText, bannerImage, links };
}

export const and8: EventSource = {
  name: "and8",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する
    for (const path of ["/de/events", "/de/e/"]) {
      const robots = await checkRobotsTxt(ORIGIN, path);
      if (!robots.allowed) {
        console.warn(`[and8] robots.txt により中止: ${robots.reason}`);
        return [];
      }
    }

    // 一覧ページ(全件が1ページに時系列で埋め込まれている)から詳細URLと日付ヒントを取得
    let listHtml: string;
    try {
      listHtml = await fetchText(LIST_URL);
    } catch (err) {
      console.error(
        `[and8] 一覧ページ取得失敗: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }

    const $list = cheerio.load(listHtml);
    const listedEvents = extractListedEvents($list);
    console.log(
      `[and8] 一覧から ${listedEvents.length} 件の詳細URLを検出(処理上限 ${MAX_EVENTS_PER_RUN} 件)`,
    );

    // 詳細ページを取得してテキスト化
    const pages: RawEventPage[] = [];
    for (const listed of listedEvents.slice(0, MAX_EVENTS_PER_RUN)) {
      try {
        const html = await fetchText(listed.url);
        const $detail = cheerio.load(html);
        const detail = extractDetailFields($detail);

        const parts = [
          `URL: ${listed.url}`,
          `イベント名: ${detail.title || listed.title}`,
          detail.subtitle ? `サブタイトル: ${detail.subtitle}` : null,
          `種別(サイト表記): ${listed.typeLabel || "不明"}`,
          `開催日(一覧より): ${listed.dateRangeText} ${listed.yearHint}年`,
          detail.eventDateText ? `開催日(詳細ページ表記・年省略あり): ${detail.eventDateText}` : null,
          `参考: この一覧上の開催日に年表記が無い場合は ${listed.yearHint}年 として扱うこと`,
          detail.venueText ? `開催地:\n${detail.venueText}` : `開催地: ${listed.venueText}`,
          detail.organizerText ? `\n主催者情報:\n${detail.organizerText}` : null,
          "",
          detail.bodyText || "(本文なし)",
          detail.links.length > 0 ? `\n関連リンク:\n${detail.links.join("\n")}` : null,
        ].filter((v): v is string => v !== null);

        const rawText = parts.join("\n").slice(0, MAX_RAW_TEXT_LENGTH);
        pages.push({ sourceUrl: listed.url, rawText, flyerUrl: detail.bannerImage });
      } catch (err) {
        console.error(
          `[and8] 詳細ページ取得失敗: ${listed.url}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return pages;
  },
};
