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

export const REEL_MAX_EVENTS = 10;
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

/**
 * Reels 候補: 公開中イベント全て。
 * これから開催(開催日の近い順) → 過去(新しい順) の順に並べる。
 * isNew = 直近7日以内に登録 / isPast = 開催終了済み。
 */
export async function fetchReelCandidates(): Promise<
  (DanceEvent & { isNew: boolean; isPast: boolean })[]
> {
  const supabase = createSupabaseServerClient();
  const today = todayJst();
  const base = () => supabase.from("events").select("*").eq("status", "published");
  const [upcoming, past] = await Promise.all([
    base().or(`date.gte.${today},end_date.gte.${today}`).order("date", { ascending: true }).limit(200),
    base().lt("date", today).order("date", { ascending: false }).limit(300),
  ]);
  if (upcoming.error && past.error) {
    console.warn("[admin] fetchReelCandidates failed:", upcoming.error?.message);
    return [];
  }
  const threshold = Date.now() - REEL_NEW_DAYS * 86400 * 1000;
  const seen = new Set<string>();
  const decorate = (row: Record<string, unknown>, isPast: boolean) => {
    const ev = rowToEvent(row);
    const base = ev.publishedAt ?? ev.createdAt;
    const published = base ? Date.parse(base) : NaN;
    return { ...ev, isNew: !Number.isNaN(published) && published >= threshold, isPast };
  };
  const result: (DanceEvent & { isNew: boolean; isPast: boolean })[] = [];
  for (const row of upcoming.data ?? []) {
    const ev = decorate(row as Record<string, unknown>, false);
    if (!seen.has(ev.id)) { seen.add(ev.id); result.push(ev); }
  }
  for (const row of past.data ?? []) {
    const ev = decorate(row as Record<string, unknown>, true);
    if (!seen.has(ev.id)) { seen.add(ev.id); result.push(ev); }
  }
  return result;
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
  secondsPerEvent?: number;
  template?: string;
  createdBy?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const supabase = createSupabaseServerClient();
  const params: Record<string, unknown> = {};
  if (input.headline) params.headline = input.headline;
  if (input.subline) params.subline = input.subline;
  if (input.secondsPerEvent) params.secondsPerEvent = input.secondsPerEvent;
  if (input.template) params.template = input.template;
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
