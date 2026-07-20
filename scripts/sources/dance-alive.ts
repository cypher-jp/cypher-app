// 情報源: DANCEALIVE (https://dancealivejapan.com/)
// 国内最大級規模を謳うダンスバトル「DANCEALIVE」公式サイト。
// 事前の想定(docs/scraper-sources.md)では「国内ダンスイベント全般のアグリゲーター」だったが、
// 実地調査の結果、他団体のイベントを横断掲載する汎用アグリゲーターではなく、
// DANCEALIVEブランド自身の地区予選(CHARISMAX/KIDS等のシリーズ)のスケジュールページであると判明した。
// とはいえ国内で毎年多数のバトルを開催しており、当サイトの掲載対象(国内ストリートダンスバトル)には合致するため
// 単独の情報源として実装する。
//
// ▼ robots.txt 調査結果 (2026-07-20 時点)
//   https://dancealivejapan.com/robots.txt は
//     User-agent: *
//     Disallow: /wp/wp-admin/
//     Allow: /wp/wp-admin/admin-ajax.php
//     (Yoast SEOブロック) User-agent: * / Disallow: (空)
//     Sitemap: https://dancealivejapan.com/sitemap_index.xml
//   本スクレイパーが使う /schedule/ (一覧) と /schedule/<slug>/ (詳細) はどちらも許可されている。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-20 時点の実地調査。WordPress製。JSON-LDはWebPage/BreadcrumbListのみでEvent型は無し)
//   - 一覧: https://dancealivejapan.com/schedule/ に「今後開催予定」の全イベント(調査時点で25件)が
//     ページネーション無しで1ページに埋め込まれている(sitemap.xml(schedule-sitemap.xml)には過去分も
//     混在するため、日付で絞り込む必要が無いこの一覧ページの方を情報源として採用した)。
//     各イベントは <a class="event-thum-box" href="https://dancealivejapan.com/schedule/<slug>/">。
//   - 詳細: /schedule/<slug>/ のHTMLは構造化データ(Event型JSON-LD)を持たないため、cheerioでクラス名を頼りに拾う。
//       - h1.page-title … 「 2027 <br> CHARISMAXⅡ -KANTO- 」のように<br>区切りで
//         「サイト上のシーズン表記(年っぽい数字だが実際の開催年と一致しないことがある)」+ イベント名 が入っている。
//         実際の開催年は下記 DATE(entry-box)の値を正とすべきなので、シーズン表記とは別にrawTextへ明記し、
//         Claudeが年を誤認しないようにする。
//       - .cat-box … カテゴリ表記(例: "GENERAL" "KIDS")
//       - .entry-box(複数) … h3.head-title(見出し: DATE/TIME/FEE/VENUE/JUDGE/DJ/MC等) + .dsc(内容)の組。
//         DATE(例: "2026.09.22")とVENUE(会場名+住所)が主要フィールド。
//       - エントリーリンク: a.entry_btn[href*="eventpay.jp"](ジャンルごとのバトルエントリー/観戦チケット外部リンク)。
//         キャンセルフォーム(/cancel/?post_id=...)等の内部リンクは対象外。
//       - フライヤー画像: meta[property="og:image"](詳細ページ用に用意された1500x1000等の画像)。
//   - <br>タグは事前に改行へ置換してからcheerio.loadすることで、.dsc内の複数行テキスト(TIME/FEE等)を
//     読みやすい形でrawTextに残す(and8.tsとは異なり本文がプレーンテキストブロックではなく短いdsc片の集合のため)。
//
// ▼ マナー
//   - politeFetch: リクエスト間隔2秒以上 / UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - 1回の実行: 詳細ページは SCRAPE_DANCEALIVE_MAX_EVENTS 件まで(既定30)
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://dancealivejapan.com";
const LIST_URL = `${ORIGIN}/schedule/`;

/** 1回の実行で処理する詳細ページの上限(環境変数 SCRAPE_DANCEALIVE_MAX_EVENTS で上書き可) */
const MAX_EVENTS_PER_RUN = parsePositiveInt(
  process.env.SCRAPE_DANCEALIVE_MAX_EVENTS,
  30,
);

/** 詳細ページURLのパターン */
const EVENT_URL_PATTERN =
  /^https:\/\/dancealivejapan\.com\/schedule\/[A-Za-z0-9_-]+\/?$/;

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

/** 一覧ページ(https://dancealivejapan.com/schedule/)からイベント詳細URLを検出順(=開催日昇順)で集める */
function extractListedUrls($: ReturnType<typeof cheerio.load>): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  $("a.event-thum-box").each((_, el) => {
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
  seasonLabel?: string;
  title: string;
  category?: string;
  entryBoxes: Array<{ heading: string; body: string }>;
  bannerImage?: string;
  entryLinks: string[];
}

/** 詳細ページ(cheerio, <br>を改行置換済み)から主要フィールドを取り出す */
function extractDetailFields($: ReturnType<typeof cheerio.load>): DetailFields {
  // h1.page-titleは "\n 2027 \nCHARISMAXⅡ -KANTO-\n" のような複数行テキストになる。
  // 先頭行がシーズン表記(年っぽい数字)、残りがイベント名。
  const titleLines = $("h1.page-title")
    .first()
    .text()
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const seasonLabel =
    titleLines.length > 1 && /^\d{4}$/.test(titleLines[0]) ? titleLines[0] : undefined;
  const titleParts = seasonLabel ? titleLines.slice(1) : titleLines;
  const title = titleParts.join(" ").trim() || $("title").text().trim();

  const category = $(".cat-box").first().text().trim() || undefined;

  const entryBoxes: Array<{ heading: string; body: string }> = [];
  $(".entry-box").each((_, el) => {
    const heading = $(el)
      .find("h3.head-title")
      .first()
      .text()
      .replace(/[ \t]+/g, " ")
      .trim();
    const body = $(el)
      .find(".dsc")
      .first()
      .text()
      .replace(/[ \t]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (heading || body) entryBoxes.push({ heading, body });
  });

  const ogImageRaw = $('meta[property="og:image"]').attr("content");
  const bannerImage = ogImageRaw ? (toAbsoluteUrl(ogImageRaw) ?? undefined) : undefined;

  const entryLinks: string[] = [];
  const seenLinks = new Set<string>();
  $('a.entry_btn[href*="eventpay.jp"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (!seenLinks.has(href)) {
      seenLinks.add(href);
      entryLinks.push(href);
    }
  });

  return { seasonLabel, title, category, entryBoxes, bannerImage, entryLinks };
}

export const danceAlive: EventSource = {
  name: "dance-alive",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する
    for (const path of ["/schedule/"]) {
      const robots = await checkRobotsTxt(ORIGIN, path);
      if (!robots.allowed) {
        console.warn(`[dance-alive] robots.txt により中止: ${robots.reason}`);
        return [];
      }
    }

    // 一覧ページ(今後開催予定の全件が1ページに埋め込まれている)から詳細URLを取得
    let listHtml: string;
    try {
      listHtml = await fetchText(LIST_URL);
    } catch (err) {
      console.error(
        `[dance-alive] 一覧ページ取得失敗: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
    }

    const $list = cheerio.load(listHtml);
    const detailUrls = extractListedUrls($list);
    console.log(
      `[dance-alive] 一覧から ${detailUrls.length} 件の詳細URLを検出(処理上限 ${MAX_EVENTS_PER_RUN} 件)`,
    );

    // 詳細ページを取得してテキスト化
    const pages: RawEventPage[] = [];
    for (const url of detailUrls.slice(0, MAX_EVENTS_PER_RUN)) {
      try {
        const html = await fetchText(url);
        const $detail = loadWithLineBreaks(html);
        const detail = extractDetailFields($detail);

        const parts = [
          `URL: ${url}`,
          `イベント名: ${detail.title}`,
          detail.seasonLabel
            ? `サイト上のシーズン表記: ${detail.seasonLabel}(実際の開催年ではないことがあるため、下記DATEに記載の年を正としてください)`
            : null,
          detail.category ? `カテゴリ(サイト表記): ${detail.category}` : null,
          "",
          ...detail.entryBoxes.map((b) => `${b.heading}:\n${b.body}`),
          detail.entryLinks.length > 0
            ? `\nエントリー/観戦チケット申込リンク:\n${detail.entryLinks.join("\n")}`
            : null,
        ].filter((v): v is string => v !== null);

        const rawText = parts.join("\n\n").slice(0, MAX_RAW_TEXT_LENGTH);
        pages.push({ sourceUrl: url, rawText, flyerUrl: detail.bannerImage });
      } catch (err) {
        console.error(
          `[dance-alive] 詳細ページ取得失敗: ${url}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return pages;
  },
};
