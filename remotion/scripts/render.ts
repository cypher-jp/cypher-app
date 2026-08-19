/**
 * reel_jobs のキューを処理して MP4 をレンダリングし、Supabase Storage(reels) にアップロードする。
 *
 * 使い方:
 *   npx tsx scripts/render.ts            … queued の古い順に最大 MAX_JOBS 件処理
 *   npx tsx scripts/render.ts <job_id>   … 指定ジョブのみ処理(queued/failed なら再実行)
 *
 * 必要な環境変数:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   SITE_URL (任意, 既定 https://worldcypher.net)
 */
import path from "node:path";
import fs from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import type { ReelEvent, ReelProps } from "../src/types";
import en from "../../messages/en.json";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.SITE_URL ?? "https://worldcypher.net";
const COMPOSITION_ID = "NewEventsReel";
const BUCKET = "reels";
const MAX_JOBS = Number(process.env.MAX_JOBS ?? 3);
const MAX_EVENTS = 6;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const REGION_LABEL = (en as { labels: { region: Record<string, string> } }).labels.region;
const GENRE_LABEL = (en as { labels: { genre: Record<string, string> } }).labels.genre;

type JobRow = {
  id: string;
  kind: string;
  status: string;
  event_ids: string[];
  params: Record<string, unknown>;
};

type EventRow = {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  type: string;
  genre: string | null;
  genres: string[] | null;
  region: string | null;
  venue: string | null;
  flyer_url: string | null;
  format: string | null;
  entry_fee: string | null;
  status: string;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function regionLabel(key: string | null): string {
  if (!key) return "";
  const label = REGION_LABEL[key] ?? key;
  // "Kanto (Other)" → "KANTO" のように括弧書きを落として短くする
  return label.replace(/\s*\(.*\)\s*/g, "").toUpperCase();
}

function genreLabel(key: string): string {
  return (GENRE_LABEL[key] ?? key).replace("All Styles", "All Style");
}

function weekLabel(now: Date): string {
  // JST 基準で「今日〜6日後」の表記 (例: "THIS WEEK · AUG 19 – 25")
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  const end = new Date(jst.getTime() + 6 * 86400 * 1000);
  const m1 = MONTHS[jst.getUTCMonth()];
  const m2 = MONTHS[end.getUTCMonth()];
  const range = m1 === m2 ? `${m1} ${jst.getUTCDate()} – ${end.getUTCDate()}` : `${m1} ${jst.getUTCDate()} – ${m2} ${end.getUTCDate()}`;
  return `THIS WEEK · ${range}`;
}

function toReelEvent(row: EventRow): ReelEvent {
  const genres = (row.genres && row.genres.length > 0 ? row.genres : row.genre ? [row.genre] : []).map(genreLabel);
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    endDate: row.end_date,
    type: row.type,
    genres,
    region: regionLabel(row.region),
    venue: row.venue,
    flyerUrl: row.flyer_url,
    format: row.format,
    entryFee: row.entry_fee,
  };
}

async function fetchEvents(ids: string[]): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id,title,date,end_date,type,genre,genres,region,venue,flyer_url,format,entry_fee,status")
    .in("id", ids);
  if (error) throw new Error(`events fetch failed: ${error.message}`);
  // 指定順(管理画面での並び=開催日順)を維持
  const byId = new Map((data ?? []).map((r) => [r.id, r as EventRow]));
  return ids.map((id) => byId.get(id)).filter((r): r is EventRow => Boolean(r));
}

async function updateJob(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("reel_jobs").update(patch).eq("id", id);
  if (error) console.warn(`[reel] job ${id} update failed: ${error.message}`);
}

async function claimJobs(jobId?: string): Promise<JobRow[]> {
  if (jobId) {
    const { data, error } = await supabase.from("reel_jobs").select("*").eq("id", jobId).maybeSingle();
    if (error || !data) throw new Error(`job ${jobId} not found: ${error?.message ?? "no row"}`);
    return [data as JobRow];
  }
  const { data, error } = await supabase
    .from("reel_jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(MAX_JOBS);
  if (error) throw new Error(`jobs fetch failed: ${error.message}`);
  return (data ?? []) as JobRow[];
}

async function renderJob(job: JobRow, serveUrl: string) {
  const started = Date.now();
  await updateJob(job.id, { status: "rendering", error: null, started_at: new Date().toISOString() });

  const rows = await fetchEvents(job.event_ids.slice(0, MAX_EVENTS));
  if (rows.length === 0) throw new Error("対象イベントがありません");

  const params = job.params ?? {};
  const props: ReelProps = {
    events: rows.map(toReelEvent),
    headline: typeof params.headline === "string" && params.headline ? params.headline : "NEW EVENTS",
    subline: typeof params.subline === "string" && params.subline ? params.subline : weekLabel(new Date()),
    siteUrl: SITE_URL,
    secondsPerEvent: typeof params.secondsPerEvent === "number" ? params.secondsPerEvent : 2.5,
  };

  const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps: props });
  const outDir = path.join(process.cwd(), "out");
  await fs.mkdir(outDir, { recursive: true });
  const mp4Path = path.join(outDir, `${job.id}.mp4`);
  const jpgPath = path.join(outDir, `${job.id}.jpg`);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: mp4Path,
    inputProps: props,
    crf: 20,
    // Instagram 推奨: H.264 / yuv420p / 30fps。音声なし。
    pixelFormat: "yuv420p",
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) process.stdout.write(`\r[reel] ${job.id} ${pct}%   `);
    },
  });
  process.stdout.write("\n");

  // サムネ(オープニング直後の1フレーム)
  await renderStill({
    composition,
    serveUrl,
    output: jpgPath,
    inputProps: props,
    frame: Math.round(composition.fps * 1.6),
    imageFormat: "jpeg",
    jpegQuality: 85,
  });

  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const base = `${stamp}_${job.id.slice(0, 8)}`;
  const mp4 = await fs.readFile(mp4Path);
  const jpg = await fs.readFile(jpgPath);

  const up1 = await supabase.storage.from(BUCKET).upload(`${base}.mp4`, mp4, {
    contentType: "video/mp4",
    upsert: true,
  });
  if (up1.error) throw new Error(`upload mp4 failed: ${up1.error.message}`);
  const up2 = await supabase.storage.from(BUCKET).upload(`${base}.jpg`, jpg, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (up2.error) console.warn(`[reel] thumbnail upload failed: ${up2.error.message}`);

  const videoUrl = supabase.storage.from(BUCKET).getPublicUrl(`${base}.mp4`).data.publicUrl;
  const thumbUrl = up2.error ? null : supabase.storage.from(BUCKET).getPublicUrl(`${base}.jpg`).data.publicUrl;

  await updateJob(job.id, {
    status: "done",
    video_url: videoUrl,
    thumbnail_url: thumbUrl,
    duration_seconds: composition.durationInFrames / composition.fps,
    finished_at: new Date().toISOString(),
    params: { ...params, rendered: { events: rows.length, headline: props.headline, subline: props.subline } },
  });
  console.log(`[reel] done ${job.id} → ${videoUrl} (${Math.round((Date.now() - started) / 1000)}s)`);
}

async function main() {
  const jobId = process.argv[2];
  const jobs = await claimJobs(jobId);
  if (jobs.length === 0) {
    console.log("[reel] queued なジョブはありません");
    return;
  }
  console.log(`[reel] ${jobs.length} 件を処理します`);

  const serveUrl = await bundle({
    entryPoint: path.join(process.cwd(), "src/index.ts"),
    publicDir: path.join(process.cwd(), "public"),
  });

  let failed = 0;
  for (const job of jobs) {
    try {
      await renderJob(job, serveUrl);
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[reel] FAILED ${job.id}: ${message}`);
      await updateJob(job.id, { status: "failed", error: message.slice(0, 2000), finished_at: new Date().toISOString() });
    }
  }
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
