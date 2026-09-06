import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * サイト内エントリー(entriesテーブル)の共通ロジック。
 * 書き込みは全てservice roleで行うため、呼び出し側で認可を確認すること
 * (公開フォームからのcreateEntryは誰でも可・イベント側の受付条件で制御)。
 */

export type EntryStatus = "entered" | "waitlisted" | "cancelled" | "checked_in";

export interface EntryRecord {
  id: string;
  eventId: string;
  name: string;
  dancerName: string | null;
  crew: string | null;
  category: string | null;
  email: string;
  status: EntryStatus;
  cancelToken: string;
  createdAt: string;
}

export function rowToEntry(row: Record<string, unknown>): EntryRecord {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    name: String(row.name ?? ""),
    dancerName: row.dancer_name ? String(row.dancer_name) : null,
    crew: row.crew ? String(row.crew) : null,
    category: row.category ? String(row.category) : null,
    email: String(row.email ?? ""),
    status: (row.status as EntryStatus) ?? "entered",
    cancelToken: String(row.cancel_token ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 定員にカウントするステータス(キャンセル待ち・キャンセルは含めない) */
const ACTIVE_STATUSES: EntryStatus[] = ["entered", "checked_in"];

export async function countActiveEntries(
  supabase: SupabaseClient,
  eventId: string,
): Promise<number> {
  const { count } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ACTIVE_STATUSES);
  return count ?? 0;
}

export type CreateEntryResult =
  | { ok: true; status: "entered" | "waitlisted"; cancelToken: string }
  | { ok: false; reason: "closed" | "duplicate" | "invalid" | "error" };

/**
 * 公開フォームからのエントリー登録。
 * 受付条件(公開中・受付ON・締切前・手動クローズでない)を満たさない場合は closed。
 * 定員超過は自動でキャンセル待ち(waitlisted)として登録する。
 */
export async function createEntry(input: {
  eventId: string;
  name: string;
  dancerName?: string;
  crew?: string;
  category?: string;
  email: string;
}): Promise<CreateEntryResult> {
  const name = input.name.trim().slice(0, 100);
  const email = input.email.trim().toLowerCase().slice(0, 200);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = createServiceClient();
  const { data: ev } = await supabase
    .from("events")
    .select("id,status,accept_entries,entry_closed,deadline,date,end_date,entry_capacity,entry_categories")
    .eq("id", input.eventId)
    .maybeSingle();
  if (!ev) return { ok: false, reason: "closed" };

  const today = todayJst();
  const lastDay = String(ev.end_date ?? ev.date ?? "");
  const open =
    ev.status === "published" &&
    ev.accept_entries === true &&
    ev.entry_closed !== true &&
    (!ev.deadline || String(ev.deadline) >= today) &&
    (!lastDay || lastDay >= today);
  if (!open) return { ok: false, reason: "closed" };

  // 部門が設定されているイベントでは、部門は設定値のいずれかに限定する
  const categories = Array.isArray(ev.entry_categories)
    ? (ev.entry_categories as string[])
    : [];
  let category = (input.category ?? "").trim().slice(0, 100) || null;
  if (categories.length > 0) {
    if (!category || !categories.includes(category)) {
      return { ok: false, reason: "invalid" };
    }
  } else {
    category = null;
  }

  const capacity =
    typeof ev.entry_capacity === "number" && ev.entry_capacity > 0
      ? ev.entry_capacity
      : null;
  const activeCount = capacity ? await countActiveEntries(supabase, input.eventId) : 0;
  const status: "entered" | "waitlisted" =
    capacity && activeCount >= capacity ? "waitlisted" : "entered";

  const { data, error } = await supabase
    .from("entries")
    .insert({
      event_id: input.eventId,
      name,
      dancer_name: (input.dancerName ?? "").trim().slice(0, 100) || null,
      crew: (input.crew ?? "").trim().slice(0, 100) || null,
      category,
      email,
      status,
    })
    .select("cancel_token")
    .single();

  if (error || !data) {
    if (error?.code === "23505") return { ok: false, reason: "duplicate" };
    console.error("[entries] createEntry failed:", error?.message);
    return { ok: false, reason: "error" };
  }
  return { ok: true, status, cancelToken: String(data.cancel_token) };
}

export type CancelEntryResult =
  | { ok: true; eventId: string; eventTitle: string; alreadyCancelled: boolean }
  | { ok: false };

/**
 * キャンセルトークンによる本人キャンセル。
 * 確定枠が空いた場合は、最も古いキャンセル待ちを自動で繰り上げる。
 */
export async function cancelEntryByToken(token: string): Promise<CancelEntryResult> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false };
  const supabase = createServiceClient();
  const { data: entry } = await supabase
    .from("entries")
    .select("id,event_id,status")
    .eq("cancel_token", token)
    .maybeSingle();
  if (!entry) return { ok: false };

  const { data: ev } = await supabase
    .from("events")
    .select("id,title")
    .eq("id", String(entry.event_id))
    .maybeSingle();
  const eventTitle = ev ? String(ev.title) : "";

  if (entry.status === "cancelled") {
    return { ok: true, eventId: String(entry.event_id), eventTitle, alreadyCancelled: true };
  }

  const wasActive = entry.status === "entered" || entry.status === "checked_in";
  const { error } = await supabase
    .from("entries")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", String(entry.id));
  if (error) return { ok: false };

  if (wasActive) {
    await promoteFromWaitlist(supabase, String(entry.event_id));
  }
  return { ok: true, eventId: String(entry.event_id), eventTitle, alreadyCancelled: false };
}

/** 定員に空きがある限り、古い順にキャンセル待ちを確定へ繰り上げる */
export async function promoteFromWaitlist(
  supabase: SupabaseClient,
  eventId: string,
): Promise<number> {
  const { data: ev } = await supabase
    .from("events")
    .select("entry_capacity")
    .eq("id", eventId)
    .maybeSingle();
  const capacity =
    ev && typeof ev.entry_capacity === "number" && ev.entry_capacity > 0
      ? ev.entry_capacity
      : null;
  if (!capacity) return 0;

  const active = await countActiveEntries(supabase, eventId);
  const slots = capacity - active;
  if (slots <= 0) return 0;

  const { data: waiting } = await supabase
    .from("entries")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "waitlisted")
    .order("created_at", { ascending: true })
    .limit(slots);
  if (!waiting || waiting.length === 0) return 0;

  const ids = waiting.map((w) => String(w.id));
  const { error } = await supabase
    .from("entries")
    .update({ status: "entered", updated_at: new Date().toISOString() })
    .in("id", ids);
  return error ? 0 : ids.length;
}
