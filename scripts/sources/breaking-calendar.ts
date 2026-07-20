// 情報源: Breaking Calendar (https://breaking-calendar.com/ja)
// 世界中のブレイキン(ブレイクダンス)大会・バトル・ジャムをまとめた多言語イベントカレンダー。
//
// ▼ robots.txt 調査結果 (2026-07-20 時点)
//   https://breaking-calendar.com/robots.txt は
//     User-Agent: *
//     Allow: /
//     Disallow: /api/, /admin, /*/admin, /*/my, /*/login, /*/register, /*/events/*/edit
//   本スクレイパーが使う /ja (トップ) と /ja/events/<id> (詳細) はどちらも許可されている
//   (Disallowの/*/events/*/editは編集画面のみを指し、詳細ページ自体は対象外)。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-20 時点の実地調査)
//   - 一覧: トップページ(https://breaking-calendar.com/ja)のHTMLに埋め込まれた
//     <script type="application/ld+json"> の CollectionPage(@id="https://breaking-calendar.com/ja#collection")
//     の mainEntity.itemListElement[].url に、今後開催される全世界のイベント詳細URL(既定40件・日付昇順)が
//     構造化データとしてそのまま入っている。可視DOMのセレクタを辿るより壊れにくいためこちらを正とする。
//   - 詳細: /ja/events/<id> のHTMLにも <script type="application/ld+json">(@type="Event") があり、
//     name(タイトル) / startDate(ISO日付) / location.name(会場・地域名) / description(本文) を構造化データとして取得できる。
//     JSON-LDが無い/壊れている場合は本文テキストをフォールバックとして使う。
//   - 画面内「Links」セクション(公式サイト/Instagram等の外部リンク)はJSON-LDに含まれないため、
//     見出し"Links"の兄弟要素<a>を拾ってrawTextへ追記する(シェアボタン・内部リンクは除外)。
//     entry_url/ig_handle等の最終判定はextract.ts(Claude)に任せる。
//   - フライヤー画像: 詳細ページのimageは https://breaking-calendar.com/api/og-image/<id> という
//     自動生成OGカード(イベント名+日付入り)。実物のフライヤーではないため、まずは「Links」セクションの
//     外部リンク(主催者の公式サイト等)先ページのog:imageから実物フライヤーの取得を試み、
//     取れた場合のみそちらを優先する。取れなければ従来どおりOGカードにフォールバックする(2026-07-20 改修)。
//
// ▼ 外部リンクからのフライヤー取得(2026-07-20 追加)
//   - 対象は「Links」セクションの外部リンクのうち、下記BLOCKED_LINK_DOMAINSに載っていない
//     一般サイトの最初の1件のみ(複数リンクがあっても深追いしない)。
//   - 訪問前に必ずそのドメインのrobots.txtをcheckRobotsTxt()で確認し、拒否されていればスキップする。
//   - 取得したページのmeta og:image(無ければog:image:secure_url / twitter:image)を実物フライヤー候補とする。
//   - 相対URLは絶対化し、.html等の明らかに画像でないURL・空値は不採用としてフォールバックする。
//   - タイムアウト・4xx/5xx・og:image無し等の失敗はすべて静かにフォールバックし、実行全体を止めない。
//
// ▼ マナー
//   - politeFetch: リクエスト間隔2秒以上 / UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - 1回の実行: 詳細ページは SCRAPE_BC_MAX_EVENTS 件まで
//   - 外部リンクも同じpoliteFetch経由でアクセスするため、上記の間隔・UA・リトライ規約がそのまま適用される
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://breaking-calendar.com";
const TOP_URL = `${ORIGIN}/ja`;

/** 1回の実行で処理する詳細ページの上限(環境変数 SCRAPE_BC_MAX_EVENTS で上書き可) */
const MAX_EVENTS_PER_RUN = parsePositiveInt(process.env.SCRAPE_BC_MAX_EVENTS, 40);

/** 詳細ページURLのパターン */
const EVENT_URL_PATTERN =
  /^https:\/\/breaking-calendar\.com\/ja\/events\/[A-Za-z0-9_-]+\/?$/;

/** シェアボタン・内部リンク等、イベント本体の情報ではないリンクを除外するための判定 */
const NON_CONTENT_LINK_PATTERN =
  /^https?:\/\/(www\.)?(twitter\.com|x\.com|facebook\.com|social-plugins\.line\.me)\//;

/** Claudeに渡す1ページあたりの最大文字数(トークン節約) */
const MAX_RAW_TEXT_LENGTH = 12000;

/**
 * 「Links」セクションの外部リンクのうち、実物フライヤー取得のために訪問してはいけないドメイン。
 * 理由ごとに分類しているので、追加・削除する際はここにコメント付きで記録すること。
 *   - SNS系: 個別ページの構造が不安定/ログイン要求等でog:imageの安定取得が見込めず、
 *     プラットフォームごとの利用規約上もスクレイピング対象として不適切なため訪問しない。
 *   - 規約リスク: 利用規約でスクレイピングを明示的に禁止している可能性が高いため訪問しない。
 *   - robots.txt: 実地調査でClaudeBotをDisallowしていることを確認済みのため訪問しない。
 */
const BLOCKED_LINK_DOMAINS: ReadonlyArray<{ domain: string; reason: string }> = [
  { domain: "instagram.com", reason: "SNS: ページ構造が不安定でスクレイピング非推奨" },
  { domain: "facebook.com", reason: "SNS: 同上" },
  { domain: "twitter.com", reason: "SNS: 同上" },
  { domain: "x.com", reason: "SNS: 同上" },
  { domain: "youtube.com", reason: "SNS: 同上" },
  { domain: "tiktok.com", reason: "SNS: 同上" },
  { domain: "linktr.ee", reason: "SNS系リンク集約サービス: 同上" },
  { domain: "line.me", reason: "SNS: LINE公式アカウント等" },
  { domain: "redbull.com", reason: "規約リスク: 利用規約でスクレイピング禁止の可能性が高い" },
  { domain: "bboychamps.com", reason: "robots.txt調査済み: ClaudeBotをDisallow" },
  { domain: "summerdanceforever.com", reason: "robots.txt調査済み: ClaudeBotをDisallow" },
];

/** 明らかに画像でないURL(HTMLページ等)を除外するための拡張子パターン */
const NON_IMAGE_URL_PATTERN = /\.(html?|php|aspx?|jsp|jsx?|json|xml|pdf)(\?.*)?$/i;

/** hostnameが禁止ドメイン(またはそのサブドメイン)に一致するか判定する */
function isBlockedLinkDomain(hostname: string): { blocked: boolean; reason?: string } {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  for (const { domain, reason } of BLOCKED_LINK_DOMAINS) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return { blocked: true, reason };
    }
  }
  return { blocked: false };
}

/**
 * 「Links」の外部リンク一覧から、実物フライヤー取得のために訪問してよい最初の1件を選ぶ。
 * 禁止ドメイン・http/https以外のURLは読み飛ばす。1件も無ければundefined。
 */
function pickExternalLinkToVisit(links: string[]): URL | undefined {
  for (const link of links) {
    let parsed: URL;
    try {
      parsed = new URL(link);
    } catch {
      continue;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;

    const { blocked, reason } = isBlockedLinkDomain(parsed.hostname);
    if (blocked) {
      console.log(
        `[breaking-calendar] 外部リンク訪問スキップ(禁止ドメイン: ${reason}): ${link}`,
      );
      continue;
    }
    return parsed;
  }
  return undefined;
}

/** 相対URLをbaseページのURLで絶対化する。失敗時はnull */
function toAbsoluteImageUrl(raw: string, base: URL): string | null {
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

/** 画像URLとして妥当そうか(HTML/PDF等の非画像拡張子でないか)を簡易判定する */
function looksLikeImageUrl(url: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  return !NON_IMAGE_URL_PATTERN.test(pathname);
}

/**
 * 「Links」セクションの外部リンク(最初の1件のみ)を訪問し、そのページのog:imageから
 * 実物フライヤー画像のURLを取得する。robots.txt拒否・タイムアウト・4xx/5xx・og:image無し等の
 * 失敗はすべてundefinedを返して呼び出し側でOGカードにフォールバックさせる(実行全体は止めない)。
 */
async function fetchRealFlyerFromExternalLink(links: string[]): Promise<string | undefined> {
  const target = pickExternalLinkToVisit(links);
  if (!target) return undefined;

  try {
    const robots = await checkRobotsTxt(target.origin, target.pathname || "/");
    if (!robots.allowed) {
      console.log(
        `[breaking-calendar] 外部リンクrobots.txtにより訪問中止: ${target.toString()} (${robots.reason})`,
      );
      return undefined;
    }

    const html = await fetchText(target.toString());
    const $ = cheerio.load(html);
    const raw =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[property="og:image:secure_url"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content");
    if (!raw || !raw.trim()) return undefined;

    const absolute = toAbsoluteImageUrl(raw.trim(), target);
    if (!absolute || !looksLikeImageUrl(absolute)) return undefined;

    console.log(
      `[breaking-calendar] 外部リンクから実物フライヤーを取得: ${target.toString()} -> ${absolute}`,
    );
    return absolute;
  } catch (err) {
    console.log(
      `[breaking-calendar] 外部リンクからのフライヤー取得失敗(OGカードへフォールバック): ${target.toString()}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return undefined;
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : NaN;
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** ページ内の<script type="application/ld+json">をすべてパースして返す(壊れたJSONは無視) */
function extractJsonLdBlocks(
  $: ReturnType<typeof cheerio.load>,
): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        blocks.push(parsed as Record<string, unknown>);
      }
    } catch {
      // 壊れたJSON-LDは無視して次に進む
    }
  });
  return blocks;
}

/** トップページのCollectionPage(JSON-LD)から「これから開催」のイベント詳細URL一覧を取り出す */
function extractUpcomingEventUrls($: ReturnType<typeof cheerio.load>): string[] {
  const blocks = extractJsonLdBlocks($);
  const collection = blocks.find(
    (b) => typeof b["@id"] === "string" && (b["@id"] as string).endsWith("#collection"),
  );
  const mainEntity = collection?.["mainEntity"] as
    | { itemListElement?: Array<{ url?: unknown }> }
    | undefined;
  const items = mainEntity?.itemListElement ?? [];

  const urls: string[] = [];
  for (const item of items) {
    const url = item?.url;
    if (typeof url === "string" && EVENT_URL_PATTERN.test(url)) {
      urls.push(url);
    }
  }
  return urls;
}

interface DetailEventJsonLd {
  title?: string;
  venue?: string;
  date?: string;
  description?: string;
}

/** 詳細ページのJSON-LD(@type="Event")から主要フィールドを取り出す */
function extractEventJsonLd($: ReturnType<typeof cheerio.load>): DetailEventJsonLd {
  const blocks = extractJsonLdBlocks($);
  const event = blocks.find((b) => b["@type"] === "Event");
  if (!event) return {};

  const location = event["location"] as { name?: unknown } | undefined;
  return {
    title: typeof event["name"] === "string" ? (event["name"] as string) : undefined,
    venue: typeof location?.name === "string" ? (location.name as string) : undefined,
    date: typeof event["startDate"] === "string" ? (event["startDate"] as string) : undefined,
    description:
      typeof event["description"] === "string" ? (event["description"] as string) : undefined,
  };
}

/** 画面内「Links」見出しの兄弟<a>(公式サイト/Instagram等)を集める。シェアボタン・内部リンクは除外 */
function extractDetailLinks($: ReturnType<typeof cheerio.load>): string[] {
  const heading = $("h2")
    .filter((_, el) => $(el).text().trim() === "Links")
    .first();
  if (heading.length === 0) return [];

  const links: string[] = [];
  heading.siblings("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (NON_CONTENT_LINK_PATTERN.test(href)) return;
    if (href.startsWith(ORIGIN)) return;
    links.push(href);
  });
  return links;
}

/** JSON-LDが取れない場合のフォールバック: 可視本文をテキスト化する */
function fallbackBodyText($: ReturnType<typeof cheerio.load>): string {
  $("script, style, noscript, iframe, nav, header, footer").remove();
  return $("body")
    .text()
    .replace(/[ \t　]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const breakingCalendar: EventSource = {
  name: "breaking-calendar",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する
    for (const path of ["/ja", "/ja/events/"]) {
      const robots = await checkRobotsTxt(ORIGIN, path);
      if (!robots.allowed) {
        console.warn(`[breaking-calendar] robots.txt により中止: ${robots.reason}`);
        return [];
      }
    }

    // トップページのCollectionPage(JSON-LD)から今後開催のイベントURL一覧を取得
    let listHtml: string;
    try {
      listHtml = await fetchText(TOP_URL);
    } catch (err) {
      console.error(
        `[breaking-calendar] トップページ取得失敗: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
    }

    const $list = cheerio.load(listHtml);
    const detailUrls = extractUpcomingEventUrls($list);
    console.log(
      `[breaking-calendar] トップページから ${detailUrls.length} 件の詳細URLを検出(処理上限 ${MAX_EVENTS_PER_RUN} 件)`,
    );

    // 詳細ページを取得してテキスト化
    const pages: RawEventPage[] = [];
    for (const url of detailUrls.slice(0, MAX_EVENTS_PER_RUN)) {
      try {
        const html = await fetchText(url);
        const $detail = cheerio.load(html);
        const jsonLd = extractEventJsonLd($detail);
        const links = extractDetailLinks($detail);

        const title = jsonLd.title ?? $detail("title").text().trim();
        const bodyText = jsonLd.description?.trim() || fallbackBodyText($detail);

        const parts = [
          `URL: ${url}`,
          `イベント名: ${title}`,
          jsonLd.date ? `開催日: ${jsonLd.date}` : null,
          jsonLd.venue ? `開催地: ${jsonLd.venue}` : null,
          "",
          bodyText,
          links.length > 0 ? `\n関連リンク:\n${links.join("\n")}` : null,
        ].filter((v): v is string => v !== null);

        const rawText = parts.join("\n").slice(0, MAX_RAW_TEXT_LENGTH);
        // 詳細URL末尾のイベントIDから自動生成OGカード画像のURL(フォールバック用)を組み立てる
        const eventId = url.split("/").filter(Boolean).pop();
        const ogCardFlyerUrl = eventId ? `${ORIGIN}/api/og-image/${eventId}` : undefined;
        // まず外部リンク(主催者サイト等)から実物フライヤーの取得を試み、取れなければOGカードを使う
        const realFlyerUrl = await fetchRealFlyerFromExternalLink(links);
        const flyerUrl = realFlyerUrl ?? ogCardFlyerUrl;
        pages.push({ sourceUrl: url, rawText, flyerUrl });
      } catch (err) {
        console.error(
          `[breaking-calendar] 詳細ページ取得失敗: ${url}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return pages;
  },
};
