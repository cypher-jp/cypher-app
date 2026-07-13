// 既存イベントの一括翻訳スクリプト。
// description_i18n が未設定(null)の published / pending イベントを対象に、
// Claude API で en/ko/zh/fr の翻訳を生成して保存する。
//
// 使い方:
//   npx tsx scripts/translate-existing.ts
//
// 必要な環境変数: ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
import { getServiceClient } from "./lib/db";
import { translateDescription } from "./lib/translate";

interface TargetRow {
  id: string;
  title: string;
  description: string;
}

async function main(): Promise<void> {
  const db = getServiceClient();

  const { data, error } = await db
    .from("events")
    .select("id,title,description")
    .is("description_i18n", null)
    .in("status", ["published", "pending"]);

  if (error) {
    throw new Error(`対象イベントの取得に失敗しました: ${error.message}`);
  }

  const targets = ((data ?? []) as TargetRow[]).filter(
    (row) => row.description && row.description.trim().length > 0,
  );
  console.log(`翻訳対象: ${targets.length} 件`);

  let ok = 0;
  let failed = 0;
  for (const row of targets) {
    try {
      const translations = await translateDescription(row.description);
      if (Object.keys(translations).length === 0) {
        console.log(`  skip(翻訳結果なし): ${row.title}`);
        continue;
      }
      const { error: updateError } = await db
        .from("events")
        .update({
          description_i18n: translations,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
      ok++;
      console.log(`  ok: ${row.title}`);
    } catch (err) {
      failed++;
      console.error(
        `  error: ${row.title}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(`完了: 成功=${ok} 失敗=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("translate-existing 失敗:", err instanceof Error ? err.message : err);
  process.exit(1);
});
