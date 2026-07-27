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
  /** published行への「事実情報のみ」自動更新の件数 */
  updatedPublished: number;
  errors: number;
}

interface ExistingRow {
  id: string;
  status: string;
  source_url: string;
  flyer_url: string | null;
}

/** fetchExistingContentHashes() の戻り値の1件分 */
export interface ExistingHashInfo {
  status: string;
  /** 保存済みハッシュ。列が無い/未設定の場合はnull(常にClaude抽出させるため) */
  contentHash: string | null;
}

/**
 * events.content_hash 列が存在するかどうかのキャッシュ。
 * null = 未確認、true/false = 確認済み。
 * migration(006_scraper_content_hash.sql)未適用の環境でもエラーにせず動くようにするための後方互換フラグ。
 */
let contentHashColumnAvailable: boolean | null = null;

/** content_hash列の有無を1回だけ確認する(以後はキャッシュを使う) */
async function ensureContentHashProbe(db: SupabaseClient): Promise<boolean> {
  if (contentHashColumnAvailable !== null) return contentHashColumnAvailable;
  const { error } = await db.from("events").select("content_hash").limit(1);
  contentHashColumnAvailable = !error;
  if (error) {
    console.warn(
      "[db] events.content_hash 列が見つかりません。変更なしイベントのスキップ判定なしで全件抽出します。" +
        "supabase/migrations/006_scraper_content_hash.sql を Supabase の SQL Editor で実行すると有効になります。",
    );
  }
  return contentHashColumnAvailable;
}

/**
 * events.genres 列が存在するかどうかのキャッシュ(content_hashと同じ後方互換パターン)。
 * migration(008_genres.sql)未適用の環境でもエラーにせず動く。
 */
let genresColumnAvailable: boolean | null = null;

/** genres列の有無を1回だけ確認する(以後はキャッシュを使う) */
async function ensureGenresProbe(db: SupabaseClient): Promise<boolean> {
  if (genresColumnAvailable !== null) return genresColumnAvailable;
  const { error } = await db.from("events").select("genres").limit(1);
  genresColumnAvailable = !error;
  if (error) {
    console.warn(
      "[db] events.genres 列が見つかりません。複数ジャンルは保存されません(genre単一のみ)。" +
        "supabase/migrations/008_genres.sql を Supabase の SQL Editor で実行すると有効になります。",
    );
  }
  return genresColumnAvailable;
}

/**
 * 指定した source_url の既存行から status と content_hash を取得する。
 * content_hash列が無い環境(migration未適用)でも動くようフォールバックする(その場合 contentHash は常にnull)。
 * scrape.ts が「変更なしイベントはClaude呼び出しをスキップする」判定に使う。
 */
export async function fetchExistingContentHashes(
  sourceUrls: string[],
): Promise<Map<string, ExistingHashInfo>> {
  const result = new Map<string, ExistingHashInfo>();
  if (sourceUrls.length === 0) return result;

  const db = getServiceClient();
  const hasHashColumn = await ensureContentHashProbe(db);
  const columns = hasHashColumn ? "source_url,status,content_hash" : "source_url,status";

  const { data, error } = await db
    .from("events")
    .select(columns)
    .in("source_url", sourceUrls);

  if (error) {
    throw new Error(`既存ハッシュの取得に失敗しました: ${error.message}`);
  }

  for (const row of (data ?? []) as unknown as {
    source_url: string;
    status: string;
    content_hash?: string | null;
  }[]) {
    result.set(row.source_url, {
      status: row.status,
      contentHash: hasHashColumn ? (row.content_hash ?? null) : null,
    });
  }
  return result;
}

/**
 * 指定した source_url 行の content_hash 列「だけ」を更新する(status/本文/updated_at には一切触れない)。
 *
 * 用途: DBに既存行はあるが content_hash が未登録(null)の場合。
 * migration(006_scraper_content_hash.sql)デプロイ直後は既存の全行がこの状態になるため、
 * 何もしなければ初回実行で全件Claude抽出が走ってしまう(≒課金が発生する)。
 * scrape.ts 側でその行のClaude抽出自体はスキップしつつ、今回fetchしたrawTextから計算した
 * 指紋だけをここで登録しておくことで、次回以降は通常の一致判定でスキップできるようになる
 * (=初回移行コストをゼロにする)。
 *
 * published行に対しても安全: 更新するのは content_hash 列のみで、status/updated_at/本文は変更しない。
 * content_hash列が無い環境(migration未適用)では何もしない(呼び出し元でensureContentHashProbeの
 * 結果を見て判断するため、ここでも念のため再チェックする)。
 */
export async function backfillContentHashes(
  updates: { sourceUrl: string; contentHash: string }[],
): Promise<{ updated: number; errors: number }> {
  const result = { updated: 0, errors: 0 };
  if (updates.length === 0) return result;

  const db = getServiceClient();
  const hasHashColumn = await ensureContentHashProbe(db);
  if (!hasHashColumn) return result;

  for (const { sourceUrl, contentHash } of updates) {
    const { error } = await db
      .from("events")
      .update({ content_hash: contentHash })
      .eq("source_url", sourceUrl);
    if (error) {
      result.errors++;
      console.error(
        `  [db] content_hash登録失敗: ${sourceUrl}: ${error.message}`,
      );
    } else {
      result.updated++;
    }
  }
  return result;
}

/** ScrapedEventRecord → events テーブルの行(snake_case)へ変換 */
function toRow(
  record: ScrapedEventRecord,
  hasHashColumn: boolean,
  hasGenresColumn: boolean,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
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
  if (hasHashColumn && record.contentHash) {
    row.content_hash = record.contentHash;
  }
  if (hasGenresColumn && record.genres && record.genres.length > 0) {
    row.genres = record.genres;
  }
  return row;
}

/**
 * published行向けの「事実情報のみ」の部分更新行を作る。
 * 情報解禁・締切延長などをサイトへ自動反映するための更新で、
 * オーナーが管理画面で手直しした可能性のあるフィールド
 * (title/type/genre/genres/region/フライヤー/ig系/status/entry_closed)には触れない。
 * フライヤーだけは「未設定の場合のみ」補完する。
 */
function toPublishedFactRow(
  record: ScrapedEventRecord,
  existing: ExistingRow,
  hasHashColumn: boolean,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    date: record.date,
    deadline: record.deadline ?? null,
    venue: record.venue,
    description: record.description,
    entry_url: record.entryUrl ?? null,
    description_i18n:
      record.descriptionI18n && Object.keys(record.descriptionI18n).length > 0
        ? record.descriptionI18n
        : null,
    updated_at: new Date().toISOString(),
  };
  if (!existing.flyer_url && record.flyerUrl) {
    row.flyer_url = record.flyerUrl;
  }
  if (hasHashColumn && record.contentHash) {
    row.content_hash = record.contentHash;
  }
  return row;
}

/**
 * source_url をキーに events へ upsert する。
 * - 新規: status='pending' で insert(管理画面で承認されるまで非公開)
 * - 既存 pending/draft: 内容を全面更新
 * - 既存 published: 事実情報(開催日/締切/会場/説明/エントリーURL)のみ自動更新
 *   (情報解禁されたイベントの詳細を自動で追従させるため。手動編集項目は保護)
 */
export async function upsertScrapedEvents(
  records: ScrapedEventRecord[],
): Promise<UpsertSummary> {
  const summary: UpsertSummary = {
    inserted: 0,
    updated: 0,
    updatedPublished: 0,
    errors: 0,
  };
  if (records.length === 0) return summary;

  const db = getServiceClient();
  const hasHashColumn = await ensureContentHashProbe(db);
  const hasGenresColumn = await ensureGenresProbe(db);
  const urls = records.map((r) => r.sourceUrl);

  const { data: existingRows, error: selectError } = await db
    .from("events")
    .select("id,status,source_url,flyer_url")
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
          .insert({ ...toRow(record, hasHashColumn, hasGenresColumn), status: "pending" });
        if (error) throw new Error(error.message);
        summary.inserted++;
        console.log(`  [db] insert(pending): ${record.title}`);
      } else if (existing.status === "published") {
        const { error } = await db
          .from("events")
          .update(toPublishedFactRow(record, existing, hasHashColumn))
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        summary.updatedPublished++;
        console.log(
          `  [db] update(published/事実情報のみ): ${record.title}`,
        );
      } else {
        const { error } = await db
          .from("events")
          .update(toRow(record, hasHashColumn, hasGenresColumn))
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
