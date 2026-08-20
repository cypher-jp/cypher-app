import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rowToEvent } from "@/lib/eventMapper";
import { buildDedupeKey } from "@/lib/admin/dedupe";
import type { DanceEvent, EventStatus , Genre } from "@/types/event";

const FLYERS_BUCKET = "flyers";

// 今日(JST)の日付 yyyy-mm-dd。公開中タブで終了済みイベントを除外する基準。
function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// 検索語をPostgRESTのilikeパターン用にエスケープ(%,_,カンマ,括弧は誤動作の元)
function toIlikePattern(q: string): string {
  return "%" + q.replace(/[%_,()]/g, " ").trim() + "%";
}

export async function fetchAdminEvents(
  status: EventStatus,
  genre?: Genre,
  options?: { q?: string; includePast?: boolean; noFlyer?: boolean },
): Promise<DanceEvent[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("events")
    .select("*")
    .eq("status", status);
  // ジャンル絞り込み(公開中タブ含む全タブで有効)。未指定なら全ジャンル。
  // 部門制の大会(genresに複数持つ)も拾えるよう、genres配列に対するcontainsで判定する。
  if (genre) query = query.contains("genres", [genre]);
  // 公開中タブは終了済み(最終日が昨日以前)を出さない。過去分は公開URLでは残るが管理対象外にする。
  if (status === "published" && !options?.includePast) {
    const today = todayJst();
    query = query.or(`date.gte.${today},end_date.gte.${today}`);
  }
  // 画像(フライヤー)未設定のみに絞る。まとめて画像を設定したい時に使う。
  if (options?.noFlyer) {
    query = query.is("flyer_url", null);
  }
  // フリーワード検索(タイトル・会場・主催・説明)。
  const q = options?.q?.trim();
  if (q) {
    const p = toIlikePattern(q);
    query = query.or(
      `title.ilike.${p},venue.ilike.${p},organizer.ilike.${p},description.ilike.${p}`,
    );
  }
  const { data, error } = await query.order("created_at", { ascending: false });

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
  const today = todayJst();
  const counts = await Promise.all(
    statuses.map(async (status) => {
      let q = supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      // 公開中の件数は一覧と同じく「開催中・これから」のみ数える
      if (status === "published") q = q.or(`date.gte.${today},end_date.gte.${today}`);
      const { count } = await q;
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
  genres: string[];
  region: string;
  date: string;
  endDate: string | null;
  deadline: string | null;
  venue: string;
  description: string;
  flyerUrl: string | null;
  igHandle: string | null;
  igPostUrl: string | null;
  entryUrl: string | null;
  status: EventStatus;
  source: string | null;
  // 詳細情報(任意)
  timeInfo: string | null;
  format: string | null;
  entryFee: string | null;
  audienceFee: string | null;
  entrySlots: string | null;
  entryMethod: string | null;
  judges: string | null;
  djs: string | null;
  mc: string | null;
  prize: string | null;
  organizer: string | null;
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
      genres: input.genres,
      region: input.region,
      date: input.date,
      end_date: input.endDate,
      deadline: input.deadline,
      venue: input.venue,
      description: input.description,
      flyer_url: input.flyerUrl,
      ig_handle: input.igHandle,
      ig_post_url: input.igPostUrl,
      entry_url: input.entryUrl,
      status: input.status,
      source: input.source,
      time_info: input.timeInfo,
      format: input.format,
      entry_fee: input.entryFee,
      audience_fee: input.audienceFee,
      entry_slots: input.entrySlots,
      entry_method: input.entryMethod,
      judges: input.judges,
      djs: input.djs,
      mc: input.mc,
      prize: input.prize,
      organizer: input.organizer,
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
      genres: input.genres,
      region: input.region,
      date: input.date,
      end_date: input.endDate,
      deadline: input.deadline,
      venue: input.venue,
      description: input.description,
      flyer_url: input.flyerUrl,
      ig_handle: input.igHandle,
      ig_post_url: input.igPostUrl,
      entry_url: input.entryUrl,
      status: input.status,
      source: input.source,
      time_info: input.timeInfo,
      format: input.format,
      entry_fee: input.entryFee,
      audience_fee: input.audienceFee,
      entry_slots: input.entrySlots,
      entry_method: input.entryMethod,
      judges: input.judges,
      djs: input.djs,
      mc: input.mc,
      prize: input.prize,
      organizer: input.organizer,
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
