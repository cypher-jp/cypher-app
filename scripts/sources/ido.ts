// 情報源: IDO - International Dance Organization (https://www.ido-dance.com/)
// 90カ国以上が加盟する国際ダンス競技団体。年間カレンダー(/calendar/competitions/<年>/)に
// 世界各国の公認大会が一覧掲載され、HIP HOP・BREAKING・POPPING等のストリート部門の
// 世界選手権/大陸選手権が含まれる。ストリート系部門の大会のみを抽出対象とする。
//
// ▼ robots.txt 調査結果 (2026-07-23 時点)
//   https://www.ido-dance.com/robots.txt は /contao/ と /_contao/ (Contao CMSの管理領域)のみDisallow。
//   本スクレイパーが使う /calendar/ は許可されている。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-23 時点の実地調査。Contao CMS製・サーバーサイドレンダリング)
//   - 年別一覧: /calendar/competitions/<年>/ に当該年の全大会がページネーション無しで並ぶ。
//     今年と翌年の2ページを取得する(翌年ページが未公開で404の場合はスキップ)。
//   - 1大会 = div.ce_authorbox。内部構造:
//       - 大会名: strong.title_* または a要素のテキスト(aは詳細ページへのリンクを持つ場合がある)
//       - 開催期間: div.date_event のテキスト "04.08.2026 - 08.08.2026"(class名に
//         date_LICENSED / date_APPLIED 等のステータスが入る)
//       - 開催地: ボックス末尾のテキスト "国 / 都市"
//   - ストリート系部門の判定: 大会名にHIP HOP/BREAK/POPPING/LOCKING/HOUSE/STREET/URBAN/KRUMP等の
//     キーワードを含む大会のみ対象とする(ディスコ・タップ・バレエ等のIDO他部門は対象外)。
//   - sourceUrl: 詳細ページリンクがあればそれを使い、無ければ一覧URL+#大会名スラッグで一意化する。
//   - フライヤー画像: 一覧に大会個別の画像は無いため無し(admin画面で手動補完可能)。
//
// ▼ マナー
//   - politeFetch: リクエスト間隔2秒以上 / UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - 1回の実行: robots.txt + 年別ページ最大2枚 = 最大3リクエスト
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://www.ido-dance.com";

/** ストリート系部門とみなす大会名キーワード(大文字比較) */
const STREET_KEYWORDS = [
  "HIP HOP",
  "HIPHOP",
  "HIP-HOP",
  "BREAK",
  "POPPING",
  "LOCKING",
  "HOUSE",
  "STREET",
  "URBAN",
  "KRUMP",
  "ELECTRIC BOOGIE",
];

/** Claudeに渡す1件あたりの最大文字数 */
const MAX_RAW_TEXT_LENGTH = 2000;

interface IdoEntry {
  title: string;
  dateRange?: string;
  status?: string;
  location?: string;
  detailUrl?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isStreetEvent(title: string): boolean {
  const upper = title.toUpperCase();
  return STREET_KEYWORDS.some((kw) => upper.includes(kw));
}

/** 年別一覧ページから大会エントリを抽出する */
function extractEntries(html: string, listUrl: string): IdoEntry[] {
  const $ = cheerio.load(html);
  const entries: IdoEntry[] = [];

  $("div.ce_authorbox").each((_, box) => {
    const $box = $(box);

    // 大会名: strong(title_*クラス) または 最初のaのテキスト
    const strongTitle = $box.find("strong[class*='title_']").first().text().trim();
    const $link = $box.find("a[href]").first();
    const linkTitle = $link.text().trim();
    const title = strongTitle || linkTitle;
    if (!title) return;

    // 開催期間とステータス(date_LICENSED等のクラス名から)
    const $date = $box.find("div.date_event").first();
    const dateRange = $date.text().replace(/\s+/g, " ").trim() || undefined;
    const statusMatch = ($date.attr("class") ?? "").match(/date_([A-Z]+)/);
    const status = statusMatch ? statusMatch[1] : undefined;

    // 開催地: ボックス全文から大会名・日付を除いた残りに "国 / 都市" が含まれる
    const fullText = $box.text().replace(/\s+/g, " ").trim();
    let rest = fullText.replace(title, "");
    if (dateRange) rest = rest.replace(dateRange, "");
    if (status) rest = rest.replace(status, "");
    const location = rest.replace(/\s+/g, " ").trim() || undefined;

    // 詳細リンク(内部リンクのみ採用)。
    // このサイトのhrefは "calendar/competitions/competition-details/?cid=..." のような
    // ルート相対(先頭スラッシュ無し)のため、一覧URL基準ではなくオリジン基準で解決する
    let detailUrl: string | undefined;
    const href = $link.attr("href");
    if (href) {
      try {
        const abs = new URL(href, `${ORIGIN}/`).toString();
        if (abs.startsWith(ORIGIN)) detailUrl = abs;
      } catch {
        detailUrl = undefined;
      }
    }

    entries.push({ title, dateRange, status, location, detailUrl });
  });

  return entries;
}

export const ido: EventSource = {
  name: "ido",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する
    const robots = await checkRobotsTxt(ORIGIN, "/calendar/");
    if (!robots.allowed) {
      console.warn(`[ido] robots.txt により中止: ${robots.reason}`);
      return [];
    }

    // 今年と翌年の年別一覧を取得する(翌年が未公開なら404で自然にスキップ)
    const currentYear = new Date().getFullYear();
    const pages: RawEventPage[] = [];
    const seen = new Set<string>();

    for (const year of [currentYear, currentYear + 1]) {
      const listUrl = `${ORIGIN}/calendar/competitions/${year}/`;
      let html: string;
      try {
        html = await fetchText(listUrl);
      } catch (err) {
        console.log(
          `[ido] ${year}年ページは取得できず(未公開の可能性): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        continue;
      }

      const entries = extractEntries(html, listUrl);
      const street = entries.filter((e) => isStreetEvent(e.title));
      console.log(
        `[ido] ${year}年: 全${entries.length}大会中、ストリート系${street.length}件を対象`,
      );

      for (const entry of street) {
        const sourceUrl =
          entry.detailUrl ?? `${listUrl}#${slugify(`${entry.title}-${entry.dateRange ?? ""}`)}`;
        if (seen.has(sourceUrl)) continue;
        seen.add(sourceUrl);

        const parts = [
          `URL: ${listUrl}`,
          "サイト: IDO (International Dance Organization) 公認大会カレンダー",
          `大会名: ${entry.title}`,
          entry.dateRange ? `開催期間: ${entry.dateRange}(DD.MM.YYYY形式)` : null,
          entry.location ? `開催地: ${entry.location}(国 / 都市)` : null,
          entry.status ? `ステータス(サイト表記): ${entry.status}` : null,
          "備考: 国際ダンス競技団体IDOの公認大会。会場詳細は未掲載のため開催都市までを情報とする。",
        ].filter((v): v is string => v !== null);

        pages.push({
          sourceUrl,
          rawText: parts.join("\n").slice(0, MAX_RAW_TEXT_LENGTH),
        });
      }
    }

    return pages;
  },
};
