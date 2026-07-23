// 情報源: Freestyle Session Japan (https://freestylesessionjapan.com/)
// 「Freestyle Session World Finals」の日本開催(2026年 千葉)を告知する単発イベント運営サイト。WordPress製。
//
// ▼ robots.txt 調査結果 (2026-07-21 時点)
//   https://freestylesessionjapan.com/robots.txt は
//     User-agent: *
//     Disallow: /wp-admin/
//     Allow: /wp-admin/admin-ajax.php
//     Sitemap: https://freestylesessionjapan.com/wp-sitemap.xml
//   本スクレイパーが使う /wp-json/ (WP REST API) は Disallow に含まれないため許可されている。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-21 時点の実地調査)
//   - ニュース一覧(https://freestylesessionjapan.com/news/)を直接HTMLパースする代わりに、
//     WordPress標準のREST API (/wp-json/wp/v2/posts) を利用する。理由:
//       - id/date/link/title.rendered/content.rendered が構造化データとしてそのまま取れ、
//         HTML一覧ページのDOM構造(クラス名等)に依存しないため壊れにくい。
//       - ?_embed=1 を付けるとアイキャッチ画像(wp:featuredmedia[0].source_url)も同じ1リクエストで
//         取得できるため、詳細ページを別途フェッチする必要が無く、2秒間隔ポリシー下でのリクエスト数を最小化できる。
//       - 既定でstatus=publish(公開記事)のみが返る(未認証アクセスのため)。
//   - 記事本文(content.rendered)はHTMLフラグメントなので、<br>を改行に変換し、
//     ブロック要素(p/div/h1-6/li/pre等)の閉じタグの後ろにも改行を補ってからcheerioでテキスト化する。
//   - フライヤー画像: _embedded["wp:featuredmedia"][0].source_url(アイキャッチ画像)。無ければundefined。
//   - 「イベントでない記事」の扱い: このサイトはイベント告知記事が中心だが、将来的に開催報告やお知らせ等の
//     非イベント記事が混ざる可能性もゼロではない。他ソース(etstage/dance-alive等)と同様、記事の絞り込みは
//     ここでは行わず全記事をそのままrawTextとして返し、日付が読み取れない/過去日の記事はscripts/lib/extract.ts
//     (Claude/Gemini抽出)側でnullを返すことで自動的に除外される(scrape.ts側で「skip(日付なし/過去日)」ログ)。
//
// ▼ マナー
//   - politeFetch: リクエスト間隔2秒以上 / UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - 1回の実行: 記事は SCRAPE_FSJ_MAX_EVENTS 件まで(既定50)。単発イベントサイトのため記事数自体が少ない。
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://freestylesessionjapan.com";
const API_BASE = `${ORIGIN}/wp-json/wp/v2/posts`;

/** WP REST APIの1リクエストあたりの取得件数 */
const PER_PAGE = 50;

/** 一覧取得を何ページまで辿るか(環境変数 SCRAPE_FSJ_MAX_PAGES で上書き可) */
const MAX_PAGES = parsePositiveInt(process.env.SCRAPE_FSJ_MAX_PAGES, 5);

/** 1回の実行で処理する記事の上限(環境変数 SCRAPE_FSJ_MAX_EVENTS で上書き可) */
const MAX_EVENTS_PER_RUN = parsePositiveInt(process.env.SCRAPE_FSJ_MAX_EVENTS, 50);

/** Claudeに渡す1ページあたりの最大文字数(トークン節約) */
const MAX_RAW_TEXT_LENGTH = 12000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : NaN;
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

interface WpRenderedField {
  rendered: string;
}

interface WpFeaturedMedia {
  source_url?: string;
}

interface WpEmbedded {
  "wp:featuredmedia"?: WpFeaturedMedia[];
}

interface WpPost {
  id: number;
  date: string;
  link: string;
  title: WpRenderedField;
  content: WpRenderedField;
  _embedded?: WpEmbedded;
}

/** WP REST APIのレスポンス1件が最低限必要なフィールドを持つか確認する(型ガード。anyは使わない) */
function isWpPost(value: unknown): value is WpPost {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.link !== "string") return false;
  if (typeof v.date !== "string") return false;
  const title = v.title as Record<string, unknown> | undefined;
  const content = v.content as Record<string, unknown> | undefined;
  return typeof title?.rendered === "string" && typeof content?.rendered === "string";
}

/** JSON文字列をWpPost[]へパースする。壊れたJSON/配列でない場合は空配列を返す */
function parseWpPosts(json: string): WpPost[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isWpPost);
}

/** title.rendered中のHTMLエンティティ(&#8220;等)を可読テキストへデコードする */
function decodeHtmlEntities(text: string): string {
  const $ = cheerio.load(`<div>${text}</div>`);
  return $("div").first().text().trim();
}

/** content.rendered(HTMLフラグメント)を改行を保ったプレーンテキストへ変換する */
function htmlFragmentToText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|pre|section|article|blockquote)>/gi, "\n</$1>");
  const $ = cheerio.load(withBreaks);
  $("script, style, noscript").remove();
  return $("body")
    .text()
    .replace(/[ \t　]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const freestyleSessionJapan: EventSource = {
  name: "freestyle-session-japan",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する
    const robots = await checkRobotsTxt(ORIGIN, "/wp-json/");
    if (!robots.allowed) {
      console.warn(`[freestyle-session-japan] robots.txt により中止: ${robots.reason}`);
      return [];
    }

    // WP REST API(?_embed=1でアイキャッチ画像も同時取得)から記事一覧を取得する
    const posts: WpPost[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${API_BASE}?per_page=${PER_PAGE}&page=${page}&_embed=1&orderby=date&order=desc`;
      let json: string;
      try {
        json = await fetchText(url);
      } catch (err) {
        // ページ範囲外(WPは400を返す)または取得失敗。取得済み分で打ち切る
        console.log(
          `[freestyle-session-japan] page=${page} で取得終了: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        break;
      }

      const pagePosts = parseWpPosts(json);
      if (pagePosts.length === 0) break;
      posts.push(...pagePosts);
      if (posts.length >= MAX_EVENTS_PER_RUN || pagePosts.length < PER_PAGE) break;
    }

    console.log(
      `[freestyle-session-japan] WP REST APIから ${posts.length} 件の記事を検出(処理上限 ${MAX_EVENTS_PER_RUN} 件)`,
    );

    const pages: RawEventPage[] = [];
    for (const post of posts.slice(0, MAX_EVENTS_PER_RUN)) {
      const title = decodeHtmlEntities(post.title.rendered);
      const bodyText = htmlFragmentToText(post.content.rendered);

      const parts = [
        `URL: ${post.link}`,
        `記事タイトル: ${title}`,
        `投稿日: ${post.date}`,
        "",
        bodyText || "(本文なし)",
      ];

      const rawText = parts.join("\n").slice(0, MAX_RAW_TEXT_LENGTH);
      const flyerUrl = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
      pages.push({ sourceUrl: post.link, rawText, flyerUrl });
    }
    return pages;
  },
};
