// スクレイパー エントリーポイント。
//
// 使い方:
//   npx tsx scripts/scrape.ts             # 収集 → 抽出 → 翻訳 → Supabaseへpending投入
//   npx tsx scripts/scrape.ts --dry-run   # DBへは書き込まず、結果JSONを表示
//
// 必要な環境変数:
//   ANTHROPIC_API_KEY            … 抽出・翻訳(Claude API)
//   SUPABASE_URL                 … 例: https://xxxx.supabase.co (--dry-run時は不要)
//   SUPABASE_SERVICE_ROLE_KEY    … Supabaseのservice roleキー (--dry-run時は不要)
import { etstage } from "./sources/etstage";
import { breakingCalendar } from "./sources/breaking-calendar";
import { and8 } from "./sources/and8";
import { danceAlive } from "./sources/dance-alive";
import { extractEventFromText } from "./lib/extract";
import { translateDescription } from "./lib/translate";
import { upsertScrapedEvents } from "./lib/db";
import type { EventSource, ScrapedEventRecord } from "./lib/types";

/** 収集対象の情報源。新しいサイトは scripts/sources/ に追加してここに並べる */
const SOURCES: EventSource[] = [etstage, breakingCalendar, and8, danceAlive];

async function collectFromSource(
  source: EventSource,
): Promise<ScrapedEventRecord[]> {
  if (!source.enabled) {
    console.log(`[${source.name}] enabled=false のためスキップ`);
    return [];
  }

  console.log(`[${source.name}] 収集開始`);
  const pages = await source.fetchRawPages();
  console.log(`[${source.name}] ${pages.length} ページを取得。抽出を開始`);

  const records: ScrapedEventRecord[] = [];
  for (const page of pages) {
    try {
      const extracted = await extractEventFromText(page.rawText);
      if (!extracted) {
        console.log(`  skip(日付なし/過去日): ${page.sourceUrl}`);
        continue;
      }
      const descriptionI18n = await translateDescription(extracted.description);
      records.push({
        ...extracted,
        sourceUrl: page.sourceUrl,
        source: source.name,
        descriptionI18n,
        flyerUrl: page.flyerUrl,
      });
      console.log(`  ok: ${extracted.title} (${extracted.date})`);
    } catch (err) {
      console.error(
        `  error: ${page.sourceUrl}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  return records;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  console.log(
    `WorldCypher scraper 開始 (${new Date().toISOString()})${dryRun ? " [dry-run]" : ""}`,
  );

  const all: ScrapedEventRecord[] = [];
  for (const source of SOURCES) {
    const records = await collectFromSource(source);
    all.push(...records);
  }

  console.log(`合計 ${all.length} 件を抽出`);

  if (dryRun) {
    console.log(JSON.stringify(all, null, 2));
    console.log(`--dry-run のためDBへは書き込みませんでした (${all.length}件)`);
    return;
  }

  const summary = await upsertScrapedEvents(all);
  console.log(
    `完了: 新規=${summary.inserted} 更新=${summary.updated} published保護=${summary.skippedPublished} エラー=${summary.errors}`,
  );

  if (summary.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("scraper 失敗:", err instanceof Error ? err.message : err);
  process.exit(1);
});
