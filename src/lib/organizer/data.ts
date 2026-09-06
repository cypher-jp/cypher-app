import { createServiceClient } from "@/lib/supabase/service";
import { rowToEvent } from "@/lib/eventMapper";
import { rowToEntry, type EntryRecord } from "@/lib/entries";
import type { DanceEvent } from "@/types/event";

/** 主催者アカウント(organizersテーブル)の1行 */
export interface OrganizerProfile {
  id: string;
  name: string;
  igHandle: string | null;
  contactEmail: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

function rowToOrganizer(row: Record<string, unknown>): OrganizerProfile {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    igHandle: row.ig_handle ? String(row.ig_handle) : null,
    contactEmail: String(row.contact_email ?? ""),
    message: row.message ? String(row.message) : null,
    status: (row.status as OrganizerProfile["status"]) ?? "pending",
    createdAt: String(row.created_at ?? ""),
  };
}

export async function fetchOrganizerProfile(
  userId: string,
): Promise<OrganizerProfile | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("organizers")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data ? rowToOrganizer(data as Record<string, unknown>) : null;
}

export async function fetchOrganizers(): Promise<OrganizerProfile[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("organizers")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => rowToOrganizer(r as Record<string, unknown>));
}

/** 主催者本人のイベント一覧(開催日の近い順) */
export async function fetchOrganizerEvents(
  organizerId: string,
): Promise<(DanceEvent & { entryCount: number; waitlistCount: number })[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("date", { ascending: true });
  const events = (data ?? []).map((r) => rowToEvent(r as Record<string, unknown>));
  if (events.length === 0) return [];

  const { data: entryRows } = await supabase
    .from("entries")
    .select("event_id,status")
    .in("event_id", events.map((e) => e.id));
  const counts = new Map<string, { entered: number; waitlisted: number }>();
  for (const row of entryRows ?? []) {
    const key = String((row as Record<string, unknown>).event_id);
    const status = String((row as Record<string, unknown>).status);
    const c = counts.get(key) ?? { entered: 0, waitlisted: 0 };
    if (status === "entered" || status === "checked_in") c.entered++;
    if (status === "waitlisted") c.waitlisted++;
    counts.set(key, c);
  }
  return events.map((e) => ({
    ...e,
    entryCount: counts.get(e.id)?.entered ?? 0,
    waitlistCount: counts.get(e.id)?.waitlisted ?? 0,
  }));
}

/** 主催者が所有するイベントを1件取得(所有権チェック込み)。所有していなければnull */
export async function fetchOwnedEvent(
  organizerId: string,
  eventId: string,
): Promise<DanceEvent | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("organizer_id", organizerId)
    .maybeSingle();
  return data ? rowToEvent(data as Record<string, unknown>) : null;
}

/** イベントのエントリー一覧(申込み順) */
export async function fetchEventEntries(eventId: string): Promise<EntryRecord[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => rowToEntry(r as Record<string, unknown>));
}
