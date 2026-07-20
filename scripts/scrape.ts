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
//   SCRAPE_FORCE_REFRESH=1       … 変更なしスキップを無視して全ページを強制的に再抽出する(逃げ道)
import { createHash } from "node:crypto";
import { etstage } from "./sources/etstage";
import { breakingCalendar } from "./sources/breaking-calendar";
import { and8 } from "./sources/and8";
import { danceAlive } from "./sources/dance-alive";
import { extractEventFromText } from "./lib/extract";
import { translateDescription } from "./lib/translate";
import {
  upsertScrapedEvents,
  fetchExistingContentHashes,
  backfillContentHashes,
} from "./lib/db";
import type { EventSource, ScrapedEventRecord } from "./lib/types";

/** 収集対象の情報源。新しいサイトは scripts/sources/ に追加してここに並べる */
const SOURCES: EventSource[] = [etstage, breakingCalendar, and8, danceAlive];

/** SCRAPE_FORCE_REFRESH=1 のときは変更なしスキップを行わず全件Claude抽出する */
const FORCE_REFRESH = process.env.SCRAPE_FORCE_REFRESH === "1";

/** ページ本文(rawText)のSHA-256(hex)。既存DBに保存済みハッシュと一致すれば「内容変更なし」と判定する */
function hashRawText(rawText: string): string {
  return createHash("sha256").update(rawText).digest("hex");
}

/** DB接続に必要な環境変数が揃っているか(--dry-runかつ未設定の場合は既存ハッシュ照会をスキップする) */
function hasDbCredentials(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function collectFromSource(
  source: EventSource,
  dryRun: boolean,
): Promise<ScrapedEventRecord[]> {
  if (!source.enabled) {
    console.log(`[${source.name}] enabled=false のためスキップ`);
    return [];
  }

  console.log(`[${source.name}] 収集開始`);
  const pages = await source.fetchRawPages();
  console.log(`[${source.name}] ${pages.length} ページを取得。抽出を開始`);

  // 既存DBの source_url → (status, content_hash) を先に取得しておく。
  // 取得できない(認証情報なし/DBエラー)場合は空マップのまま扱い、従来どおり全件抽出する。
  let existingHashes = new Map<
    string,
    { status: string; contentHash: string | null }
  >();
  if (!FORCE_REFRESH && hasDbCredentials()) {
    try {
      existingHashes = await fetchExistingContentHashes(
        pages.map((p) => p.sourceUrl),
      );
    } catch (err) {
      console.warn(
        `[${source.name}] 既存ハッシュの取得に失敗したため、スキップ判定なしで全件抽出します: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  const records: ScrapedEventRecord[] = [];
  // 既存行はあるがcontent_hash未登録(null)だったもの。Claude抽出はスキップしつつ、
  // 今回計算した指紋だけを後でDBに登録(UPDATE)する対象として集める。
  const toBackfill: { sourceUrl: string; contentHash: string }[] = [];
  let skippedMatchCount = 0; // ハッシュ一致で完全スキップ(DBに触れない)
  let skippedNullCount = 0; // 既存行はあるがハッシュ未登録 → 抽出はスキップし指紋だけ登録
  for (const page of pages) {
    const contentHash = hashRawText(page.rawText);
    const existing = existingHashes.get(page.sourceUrl);

    if (!FORCE_REFRESH && existing) {
      if (existing.contentHash) {
        if (existing.contentHash === contentHash) {
          // 内容変更なし: Claude(抽出・翻訳)を一切呼ばずにスキップする。DBの当該行にも触れない。
          skippedMatchCount++;
          continue;
        }
        // ハッシュ不一致: 内容が変わっているので下に進み再抽出・再翻訳する(従来どおり)。
      } else {
        // 既存行はあるがcontent_hash未登録(migration適用直後などの初回移行ケース)。
        // ここでClaudeを呼ぶと初回だけ課金が発生してしまうため、抽出はスキップし
        // 今回fetchしたrawTextから計算した指紋だけを登録対象にする。
        skippedNullCount++;
        toBackfill.push({ sourceUrl: page.sourceUrl, contentHash });
        continue;
      }
    }

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
        contentHash,
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

  // toBackfillに集めた行は、DBに既存行はあるがcontent_hashが未登録だったもの。
  // ここで初めてcontent_hashだけをUPDATEする(--dry-run時はDBに一切書き込まないため実行しない)。
  let backfilledCount = 0;
  if (!dryRun && toBackfill.length > 0) {
    const result = await backfillContentHashes(toBackfill);
    backfilledCount = result.updated;
    if (result.errors > 0) {
      console.warn(
        `[${source.name}] 指紋(content_hash)の登録に${result.errors}件失敗しました`,
      );
    }
  }

  const totalSkipped = skippedMatchCount + skippedNullCount;
  if (pages.length > 0) {
    const registeredNote = dryRun
      ? `(--dry-runのため指紋登録は未実施、対象${skippedNullCount}件)`
      : `(うち${backfilledCount}件に指紋を登録)`;
    console.log(
      `[${source.name}] ${pages.length}件中 ${totalSkipped}件は既存のためスキップ${registeredNote}、${
        pages.length - totalSkipped
      }件を抽出`,
    );
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
    const records = await collectFromSource(source, dryRun);
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
