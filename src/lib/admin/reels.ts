import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rowToEvent } from "@/lib/eventMapper";
import type { DanceEvent } from "@/types/event";

/** Reels 生成ジョブ(reel_jobs)の1行 */
export type ReelJob = {
  id: string;
  kind: string;
  status: "queued" | "rendering" | "done" | "failed";
  eventIds: string[];
  params: Record<string, unknown>;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
  durationSeconds: number | null;
  createdBy: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export const REEL_MAX_EVENTS = 6;
export const REEL_NEW_DAYS = 7;

function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function rowToJob(row: Record<string, unknown>): ReelJob {
  return {
    id: String(row.id),
    kind: String(row.kind ?? "new_events"),
    status: (row.status as ReelJob["status"]) ?? "queued",
    eventIds: Array.isArray(row.event_ids) ? (row.event_ids as string[]) : [],
    params: (row.params as Record<string, unknown>) ?? {},
    videoUrl: row.video_url ? String(row.video_url) : null,
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
    error: row.error ? String(row.error) : null,
    durationSeconds: typeof row.duration_seconds === "number" ? row.duration_seconds : row.duration_seconds ? Number(row.duration_seconds) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
  };
}

/** Reels 候補: 公開中 & これから開催のイベント(開催日順)。isNew = 直近7日以内に登録。 */
export async function fetchReelCandidates(): Promise<(DanceEvent & { isNew: boolean })[]> {
  const supabase = createSupabaseServerClient();
  const today = todayJst();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .or(`date.gte.${today},end_date.gte.${today}`)
    .order("date", { ascending: true })
    .limit(200);
  if (error || !data) {
    console.warn("[admin] fetchReelCandidates failed:", error?.message);
    return [];
  }
  const threshold = Date.now() - REEL_NEW_DAYS * 86400 * 1000;
  return data.map((row) => {
    const ev = rowToEvent(row);
    const created = ev.createdAt ? Date.parse(ev.createdAt) : NaN;
    return { ...ev, isNew: !Number.isNaN(created) && created >= threshold };
  });
}

export async function fetchReelJobs(limit = 30): Promise<ReelJob[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reel_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) {
    console.warn("[admin] fetchReelJobs failed:", error?.message);
    return [];
  }
  return data.map((r) => rowToJob(r as Record<string, unknown>));
}

export async function insertReelJob(input: {
  eventIds: string[];
  headline?: string;
  subline?: string;
  createdBy?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const supabase = createSupabaseServerClient();
  const params: Record<string, unknown> = {};
  if (input.headline) params.headline = input.headline;
  if (input.subline) params.subline = input.subline;
  const { data, error } = await supabase
    .from("reel_jobs")
    .insert({
      kind: "new_events",
      status: "queued",
      event_ids: input.eventIds,
      params,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "insert failed" };
  return { id: String(data.id) };
}

export async function requeueReelJob(id: string): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("reel_jobs")
    .update({ status: "queued", error: null, started_at: null, finished_at: null })
    .eq("id", id);
  return error ? error.message : null;
}

export async function deleteReelJob(id: string): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("reel_jobs").delete().eq("id", id);
  return error ? error.message : null;
}

/**
 * GitHub Actions の render-reel ワークフローを即時起動する(repository_dispatch)。
 * GITHUB_DISPATCH_TOKEN 未設定なら何もしない(30分おきの定期実行が拾う)。
 * 戻り値: 起動できたら true。
 */
export async function triggerReelRender(jobId: string): Promise<{ dispatched: boolean; error?: string }> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "cypher-jp/cypher-app";
  if (!token) return { dispatched: false };
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_type: "render-reel", client_payload: { job_id: jobId } }),
      cache: "no-store",
    });
    if (res.status === 204) return { dispatched: true };
    const text = await res.text();
    return { dispatched: false, error: `GitHub ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { dispatched: false, error: e instanceof Error ? e.message : String(e) };
  }
}
