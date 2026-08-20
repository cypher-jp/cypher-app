/**
 * 過去に登録済みのイベントへ、詳細情報(judges/djs/entry_fee/format など11項目)を
 * AI(Gemini)で一括バックフィルするスクリプト。
 *
 * 対象: 詳細フィールドが全て未設定 & description がある published/pending イベント。
 * description(とタイトル・会場)から読み取れる範囲だけ埋め、分からない項目は触らない。
 * 既に値が入っている項目は上書きしない(null のカラムのみ更新)。
 *
 * 実行: npx tsx scripts/backfill-details.ts [limit]
 * 必要な環境変数: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY (or ANTHROPIC_API_KEY)
 */
import { generateText } from "./lib/ai-client";
import { getServiceClient } from "./lib/db";

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

const SYSTEM = `あなたはダンスイベント情報の抽出係です。イベントの説明文から以下の項目を抽出し、JSONだけを出力してください。
説明文に書かれていない項目は必ず null にしてください。推測・創作は禁止です。

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

async function main() {
  const limit = Math.min(200, Math.max(1, Number(process.argv[2]) || 60));
  const supabase = getServiceClient();

  // 未処理(details_backfilled_atが空)のイベントのみを対象にする。
  // 「抽出できるものが無かった」イベントにもマーカーを付けるので、同じ行を毎回再処理しない。
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,title,date,venue,description,status,time_info,format,entry_fee,audience_fee,entry_slots,judges,djs,mc,prize,organizer",
    )
    .in("status", ["published", "pending"])
    .not("description", "is", null)
    .is("details_backfilled_at", null)
    .order("created_at", { ascending: false })
    .limit(limit * 2);
  if (error) throw new Error(`events fetch failed: ${error.message}`);

  // description が短すぎるものを除外してから limit 件処理する。
  const targets = (data ?? [])
    .filter((r) => typeof r.description === "string" && r.description.trim().length >= 40)
    .slice(0, limit);

  console.log(`[backfill] 対象 ${targets.length} 件 (limit=${limit})`);
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of targets) {
    try {
      const user = `タイトル: ${row.title}\n開催日: ${row.date}\n会場: ${row.venue ?? "不明"}\n\n【説明文】\n${String(row.description).slice(0, 4000)}`;
      const raw = await generateText({ system: SYSTEM, user, maxTokens: 1000, jsonResponse: true });
      const jsonText = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;

      const patch: Partial<Record<DetailColumn, string>> = {};
      for (const col of DETAIL_COLUMNS) {
        // 既に値が入っている項目は上書きしない(手入力を守る)
        if ((row as Record<string, unknown>)[col] != null) continue;
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
        console.log(`[backfill] skip (抽出なし): ${row.title}`);
      }
      const { error: upError } = await supabase.from("events").update(payload).eq("id", row.id);
      if (upError) throw new Error(upError.message);
      if (Object.keys(patch).length > 0) {
        updated++;
        console.log(`[backfill] ok: ${row.title} → ${Object.keys(patch).join(", ")}`);
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
