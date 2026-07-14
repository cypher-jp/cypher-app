// Supabase への書き込み層(スクレイパー専用)。
// SUPABASE_SERVICE_ROLE_KEY を使うためRLSをバイパスする。
// このモジュールは GitHub Actions / ローカルCLI からのみ実行され、
// Next.js アプリ本体(クライアント/サーバー)からは絶対にimportしないこと。
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ScrapedEventRecord } from "./types";

let client: SupabaseClient | null = null;

/** service role クライアントを返す(遅延初期化) */
export function getServiceClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません。GitHub Secrets / ローカルのexport を確認してください。",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export interface UpsertSummary {
  inserted: number;
  updated: number;
  skippedPublished: number;
  errors: number;
}

interface ExistingRow {
  id: string;
  status: string;
  source_url: string;
}

/** ScrapedEventRecord → events テーブルの行(snake_case)へ変換 */
function toRow(record: ScrapedEventRecord): Record<string, unknown> {
  return {
    title: record.title,
    type: record.type,
    genre: record.genre,
    region: record.region,
    date: record.date,
    deadline: record.deadline ?? null,
    venue: record.venue,
    description: record.description,
    entry_url: record.entryUrl ?? null,
    flyer_url: record.flyerUrl ?? null,
    ig_handle: record.igHandle ?? null,
    ig_post_url: record.igUrl ?? null,
    source: record.source,
    source_url: record.sourceUrl,
    description_i18n:
      record.descriptionI18n && Object.keys(record.descriptionI18n).length > 0
        ? record.descriptionI18n
        : null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * source_url をキーに events へ upsert する。
 * - 新規: status='pending' で insert(管理画面で承認されるまで非公開)
 * - 既存 pending/draft: 内容を更新
 * - 既存 published: 上書きしない(ログのみ)
 */
export async function upsertScrapedEvents(
  records: ScrapedEventRecord[],
): Promise<UpsertSummary> {
  const summary: UpsertSummary = {
    inserted: 0,
    updated: 0,
    skippedPublished: 0,
    errors: 0,
  };
  if (records.length === 0) return summary;

  const db = getServiceClient();
  const urls = records.map((r) => r.sourceUrl);

  const { data: existingRows, error: selectError } = await db
    .from("events")
    .select("id,status,source_url")
    .in("source_url", urls);

  if (selectError) {
    throw new Error(`既存行の取得に失敗しました: ${selectError.message}`);
  }

  const existingByUrl = new Map<string, ExistingRow>(
    ((existingRows ?? []) as ExistingRow[]).map((row) => [row.source_url, row]),
  );

  for (const record of records) {
    const existing = existingByUrl.get(record.sourceUrl);
    try {
      if (!existing) {
        const { error } = await db
          .from("events")
          .insert({ ...toRow(record), status: "pending" });
        if (error) throw new Error(error.message);
        summary.inserted++;
        console.log(`  [db] insert(pending): ${record.title}`);
      } else if (existing.status === "published") {
        summary.skippedPublished++;
        console.log(
          `  [db] skip(published保護): ${record.title} (${record.sourceUrl})`,
        );
      } else {
        const { error } = await db
          .from("events")
          .update(toRow(record))
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        summary.updated++;
        console.log(`  [db] update(${existing.status}): ${record.title}`);
      }
    } catch (err) {
      summary.errors++;
      console.error(
        `  [db] error: ${record.sourceUrl}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return summary;
}
