/**
 * イベントの詳細情報(judges/djs/entry_fee/format など)をAI(Gemini)でバックフィルするスクリプト。
 *
 * 精度向上のため、説明文だけでなく「取得元ページ(source_url)」と「エントリーページ(entry_url)」の
 * 本文も実際にフェッチしてAIに渡す(=大元のサイトまで見に行って抽出する)。
 *
 * 実行:
 *   npx tsx scripts/backfill-details.ts [limit]          … 未処理(details_backfilled_atが空)を処理
 *   npx tsx scripts/backfill-details.ts [limit] sparse   … 処理済みでも詳細がスカスカな行を再抽出
 *
 * 必要な環境変数: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY (or ANTHROPIC_API_KEY)
 */
import * as cheerio from "cheerio";
import { generateText } from "./lib/ai-client";
import { getServiceClient } from "./lib/db";
import { fetchText } from "./lib/fetch";

const DETAIL_COLUMNS = [
  "time_info",
  "format",
  "entry_fee",
  "audience_fee",
  "entry_slots",
  "judges",
  "djs",
  "mc",
  "prize",
  "organizer",
] as const;

type DetailColumn = (typeof DETAIL_COLUMNS)[number];

const SYSTEM = `あなたはダンスイベント情報の抽出係です。イベントの説明文と参考ページ本文から以下の項目を抽出し、JSONだけを出力してください。
書かれていない項目は必ず null にしてください。推測・創作は禁止です。
参考ページ本文にはナビゲーションや広告の文字列が混ざることがあります。対象イベントに関する記述だけを使ってください。

出力スキーマ(全てstringまたはnull):
{
  "time_info": "開場・開始時刻など (例: OPEN 12:00 / START 13:00)",
  "format": "バトル形式 (例: 1on1, 2on2, crew, 1on1 KIDS & 一般)",
  "entry_fee": "エントリー費 (例: ¥2,000 +1D)",
  "audience_fee": "観覧費",
  "entry_slots": "エントリー枠数 (例: 32名, 先着64)",
  "judges": "審査員 (カンマ区切り)",
  "djs": "DJ (カンマ区切り)",
  "mc": "MC",
  "prize": "優勝賞金・賞品",
  "organizer": "主催者"
}`;

/** HTML全体を、改行を保ったプレーンテキストへ変換する(single-page-source.tsと同等) */
function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|pre|section|article|blockquote|tr)>/gi, "\n</$1>");
  const $ = cheerio.load(withBreaks);
  $("script, style, noscript, iframe, link, meta, nav, footer, header").remove();
  return $("body")
    .text()
    .replace(/[ \t　]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** ログイン必須・bot遮断でフェッチしても意味がないドメイン */
const SKIP_HOSTS = ["instagram.com", "facebook.com", "x.com", "twitter.com", "tiktok.com"];

/** URLのページ本文を取得してテキスト化する。失敗やSNSドメインはnull */
async function fetchPageText(url: string | null, maxChars: number): Promise<string | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (SKIP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;
    const html = await fetchText(url);
    const text = htmlToText(html);
    if (text.length < 100) return null; // JSレンダリングのみのページ等は諦める
    return text.slice(0, maxChars);
  } catch {
    return null;
  }
}

type Row = Record<string, unknown> & { id: string; title: string };

async function main() {
  const limit = Math.min(200, Math.max(1, Number(process.argv[2]) || 60));
  const sparseMode = process.argv[3] === "sparse";
  const supabase = getServiceClient();

  const select =
    "id,title,date,venue,description,status,source_url,entry_url,time_info,format,entry_fee,audience_fee,entry_slots,judges,djs,mc,prize,organizer";

  const base = () =>
    supabase
      .from("events")
      .select(select)
      .in("status", ["published", "pending"])
      .not("description", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit * 2);

  // sparse = 処理済みだが主要項目がほぼ空 & 参照できるページがある行を再抽出。
  // normal = 未処理(details_backfilled_atが空)の行のみ。
  const { data, error } = sparseMode
    ? await base()
        .not("details_backfilled_at", "is", null)
        .is("judges", null)
        .is("djs", null)
        .is("entry_fee", null)
        .is("time_info", null)
        .not("source_url", "is", null)
    : await base().is("details_backfilled_at", null);
  if (error) throw new Error(`events fetch failed: ${error.message}`);

  const targets = (data ?? [])
    .filter((r) => typeof r.description === "string" && String(r.description).trim().length >= 20)
    .slice(0, limit) as Row[];

  console.log(`[backfill] 対象 ${targets.length} 件 (limit=${limit}, mode=${sparseMode ? "sparse" : "normal"})`);
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of targets) {
    try {
      // 大元のページを実際に読みに行く(取得元 + エントリーページ)
      const sourceText = await fetchPageText(row.source_url as string | null, 6000);
      const entryText =
        row.entry_url && row.entry_url !== row.source_url
          ? await fetchPageText(row.entry_url as string | null, 2500)
          : null;

      let user = `タイトル: ${row.title}\n開催日: ${row.date}\n会場: ${row.venue ?? "不明"}\n\n【説明文】\n${String(row.description).slice(0, 4000)}`;
      if (sourceText) user += `\n\n【取得元ページ本文】\n${sourceText}`;
      if (entryText) user += `\n\n【エントリーページ本文】\n${entryText}`;

      const raw = await generateText({ system: SYSTEM, user, maxTokens: 1000, jsonResponse: true });
      const jsonText = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;

      const patch: Partial<Record<DetailColumn, string>> = {};
      for (const col of DETAIL_COLUMNS) {
        // 既に値が入っている項目は上書きしない(手入力を守る)
        if (row[col] != null) continue;
        const v = parsed[col];
        if (typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null") {
          patch[col] = v.trim().slice(0, 500);
        }
      }
      // 処理済みマーカー(抽出なしでも付けて再処理を防ぐ)。
      // このマーカーを含む更新では updated_at は変わらない(トリガー側で除外済み)。
      const payload = { ...patch, details_backfilled_at: new Date().toISOString() };
      if (Object.keys(patch).length === 0) {
        skipped++;
        console.log(`[backfill] skip (抽出なし): ${row.title}${sourceText ? " [ページ取得済]" : ""}`);
      }
      const { error: upError } = await supabase.from("events").update(payload).eq("id", row.id);
      if (upError) throw new Error(upError.message);
      if (Object.keys(patch).length > 0) {
        updated++;
        console.log(
          `[backfill] ok: ${row.title} → ${Object.keys(patch).join(", ")}${sourceText ? " [ページ取得済]" : ""}`,
        );
      }
    } catch (e) {
      failed++;
      console.warn(`[backfill] FAILED: ${row.title}: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`[backfill] 完了: 更新 ${updated} / 抽出なし ${skipped} / 失敗 ${failed}`);
  if (failed > 0 && updated === 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
