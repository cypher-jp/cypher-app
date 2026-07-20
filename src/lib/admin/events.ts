import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rowToEvent } from "@/lib/eventMapper";
import { buildDedupeKey } from "@/lib/admin/dedupe";
import type { DanceEvent, EventStatus } from "@/types/event";

const FLYERS_BUCKET = "flyers";

export async function fetchAdminEvents(
  status: EventStatus,
): Promise<DanceEvent[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("[admin] fetchAdminEvents failed:", error?.message);
    return [];
  }

  return data.map(rowToEvent);
}

export async function fetchAdminEventCounts(): Promise<
  Record<EventStatus, number>
> {
  const supabase = createSupabaseServerClient();
  const statuses: EventStatus[] = ["pending", "published", "draft"];
  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      return [status, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(counts) as Record<EventStatus, number>;
}

export async function fetchAdminEventById(
  id: string,
): Promise<DanceEvent | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToEvent(data);
}

export interface EventInput {
  title: string;
  type: string;
  genre: string;
  region: string;
  date: string;
  deadline: string | null;
  venue: string;
  description: string;
  flyerUrl: string | null;
  igHandle: string | null;
  igPostUrl: string | null;
  entryUrl: string | null;
  status: EventStatus;
  source: string | null;
}

export async function insertEvent(
  supabase: SupabaseClient,
  input: EventInput,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: input.title,
      type: input.type,
      genre: input.genre,
      region: input.region,
      date: input.date,
      deadline: input.deadline,
      venue: input.venue,
      description: input.description,
      flyer_url: input.flyerUrl,
      ig_handle: input.igHandle,
      ig_post_url: input.igPostUrl,
      entry_url: input.entryUrl,
      status: input.status,
      source: input.source,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[admin] insertEvent failed:", error?.message);
    return null;
  }
  return { id: String(data.id) };
}

export async function updateEvent(
  supabase: SupabaseClient,
  id: string,
  input: EventInput,
): Promise<boolean> {
  const { error } = await supabase
    .from("events")
    .update({
      title: input.title,
      type: input.type,
      genre: input.genre,
      region: input.region,
      date: input.date,
      deadline: input.deadline,
      venue: input.venue,
      description: input.description,
      flyer_url: input.flyerUrl,
      ig_handle: input.igHandle,
      ig_post_url: input.igPostUrl,
      entry_url: input.entryUrl,
      status: input.status,
      source: input.source,
    })
    .eq("id", id);

  if (error) {
    console.error("[admin] updateEvent failed:", error.message);
    return false;
  }
  return true;
}

export async function updateEventStatus(
  supabase: SupabaseClient,
  id: string,
  status: EventStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("[admin] updateEventStatus failed:", error.message);
    return false;
  }
  return true;
}

/**
 * 承認しようとしているイベントと「同一イベントらしき」承認待ち(pending)の
 * 他の行を探す。重複判定は開催日+正規化タイトルの一致(lib/admin/dedupe.ts)。
 * DBスキーマを変更せず、承認時にその場で突き合わせる方式。
 */
export async function findDuplicatePendingEventIds(
  supabase: SupabaseClient,
  event: Pick<DanceEvent, "id" | "date" | "title">,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id,title,date")
    .eq("status", "pending")
    .eq("date", event.date)
    .neq("id", event.id);

  if (error || !data) {
    if (error) {
      console.warn(
        "[admin] findDuplicatePendingEventIds failed:",
        error.message,
      );
    }
    return [];
  }

  const key = buildDedupeKey(event);
  return (data as { id: string; title: string; date: string }[])
    .filter((row) => buildDedupeKey({ date: row.date, title: row.title }) === key)
    .map((row) => String(row.id));
}

/**
 * フライヤー画像を Supabase Storage の `flyers` バケットにアップロードし、
 * 公開URLを返す。バケットとポリシーは supabase/migrations/003_admin.sql を参照。
 */
export async function uploadFlyer(
  supabase: SupabaseClient,
  file: File,
): Promise<string> {
  const extFromName = file.name.split(".").pop();
  const ext = extFromName && extFromName.length <= 5 ? extFromName : "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(FLYERS_BUCKET)
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    throw new Error(`フライヤーのアップロードに失敗しました: ${error.message}`);
  }

  const { data } = supabase.storage.from(FLYERS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
