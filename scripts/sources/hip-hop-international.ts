// 情報源: Hip Hop International (https://hiphopinternational.com/)
// 世界50カ国以上で各国大会を開催し、世界大会(HHI Worlds)へつながる世界最大級の
// ヒップホップダンスクルー選手権の運営団体。世界各国のスケジュール一覧ページ
// (/schedule-of-events-worldwide/)から今後開催の大会を抽出する。
//
// ▼ robots.txt 調査結果 (2026-07-23 時点)
//   https://hiphopinternational.com/robots.txt は WordPress標準(/wp-admin/のみDisallow)。
//   本スクレイパーが使う /schedule-of-events-worldwide/ は許可されている。
//   念のため実行のたびに checkRobotsTxt() で再確認し、拒否されたら即座に収集を中止する。
//
// ▼ サイト構造 (2026-07-23 時点の実地調査。WordPress製・サーバーサイドレンダリング)
//   - 一覧: /schedule-of-events-worldwide/ の table.t1 に全大会が行として並ぶ(調査時点で60行超)。
//     各行 = [大会名(例 "HHI JAPAN - TOKYO" / "WORLDS 2026 - PHOENIX"), 開催期間("M/D/YYYY - M/D/YYYY")]。
//   - 行ごとの個別リンク・会場情報・画像は無い。開催国・都市は大会名から読み取れるため、
//     region分類はextract側(AI)に委ねる。
//   - 終了済みの行も混在するため、終了日が過去の行はリクエスト削減のためここで除外する
//     (日付が読めない行は念のため残してextract側の判定に委ねる)。
//   - sourceUrl: 個別URLが無いため、一覧URL+#大会名スラッグで一意化する。
//
// ▼ マナー
//   - politeFetch: リクエスト間隔2秒以上 / UA "WorldCypherBot/1.0" 明記 / リトライ制御
//   - 1回の実行: robots.txt + 一覧ページ1枚 = 2リクエスト
import * as cheerio from "cheerio";
import { checkRobotsTxt, fetchText } from "../lib/fetch";
import type { EventSource, RawEventPage } from "../lib/types";

const ORIGIN = "https://hiphopinternational.com";
const LIST_URL = `${ORIGIN}/schedule-of-events-worldwide/`;

/** Claudeに渡す1件あたりの最大文字数 */
const MAX_RAW_TEXT_LENGTH = 1500;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "M/D/YYYY" をDateへ。読めなければnull */
function parseUsDate(text: string): Date | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(date.getTime()) ? null : date;
}

interface HhiRow {
  name: string;
  dateRange: string;
  endDate: Date | null;
}

/** 一覧ページのtable.t1から行を抽出する */
function extractRows(html: string): HhiRow[] {
  const $ = cheerio.load(html);
  const rows: HhiRow[] = [];
  $("table.t1 tr").each((_, tr) => {
    const cells = $(tr)
      .find("td,th")
      .map((__, td) => $(td).text().replace(/\s+/g, " ").trim())
      .get();
    if (cells.length < 2) return;
    const [name, dateRange] = cells;
    if (!name || !dateRange || !/\d{4}/.test(dateRange)) return;

    // "M/D/YYYY - M/D/YYYY" の終了日側(片側だけの場合はそれを終了日とみなす)
    const partsOfRange = dateRange.split("-").map((s) => s.trim());
    const endText = partsOfRange[partsOfRange.length - 1];
    rows.push({ name, dateRange, endDate: parseUsDate(endText) });
  });
  return rows;
}

export const hipHopInternational: EventSource = {
  name: "hip-hop-international",
  enabled: true,

  async fetchRawPages(): Promise<RawEventPage[]> {
    // 実行のたびにrobots.txtを再確認する
    const robots = await checkRobotsTxt(ORIGIN, "/schedule-of-events-worldwide/");
    if (!robots.allowed) {
      console.warn(`[hip-hop-international] robots.txt により中止: ${robots.reason}`);
      return [];
    }

    let html: string;
    try {
      html = await fetchText(LIST_URL);
    } catch (err) {
      console.error(
        `[hip-hop-international] 一覧ページ取得失敗: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
    }

    const rows = extractRows(html);
    // 終了日が昨日以前の大会は除外(日付が読めない行はextract側の判定に委ねるため残す)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = rows.filter((r) => r.endDate === null || r.endDate >= today);
    console.log(
      `[hip-hop-international] 一覧${rows.length}行中、今後開催${upcoming.length}件を対象`,
    );

    const seen = new Set<string>();
    const pages: RawEventPage[] = [];
    for (const row of upcoming) {
      const sourceUrl = `${LIST_URL}#${slugify(`${row.name}-${row.dateRange}`)}`;
      if (seen.has(sourceUrl)) continue;
      seen.add(sourceUrl);

      const parts = [
        `URL: ${LIST_URL}`,
        "サイト: Hip Hop International (HHI) 世界各国大会スケジュール",
        `大会名: ${row.name}(名前の中に開催国・都市が含まれる。WORLDSは世界大会)`,
        `開催期間: ${row.dateRange}(M/D/YYYY形式・米国式)`,
        "備考: ヒップホップダンスクルー選手権(HHI)の公式大会。会場詳細は未掲載のため開催都市までを情報とする。ジャンルはヒップホップクルーの大会。",
      ];

      pages.push({
        sourceUrl,
        rawText: parts.join("\n").slice(0, MAX_RAW_TEXT_LENGTH),
      });
    }
    return pages;
  },
};
