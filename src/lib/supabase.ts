import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { DanceEvent } from "@/types/event";
import { MOCK_EVENTS } from "@/lib/mockEvents";
import { rowToEvent } from "@/lib/eventMapper";
import { filterPastEventsDesc, filterUpcomingEvents, getTodayIsoJst } from "@/lib/eventDate";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabaseの環境変数が設定されていない場合は null
let client: SupabaseClient | null = null;
if (url && anonKey) {
    try {
          client = createClient(url, anonKey);
    } catch {
          client = null;
    }
}

export const supabase = client;
export const isSupabaseEnabled = client !== null;

/**
 * Supabaseが繋がっていればDBから、なければモックを返す。
 * 設定し忘れててもサイトが落ちない安全網。
 * 公開側専用: RLSにより status='published' のみ取得できる(anonキー)。
 */
export async function fetchEvents(): Promise<DanceEvent[]> {
    if (!client) return MOCK_EVENTS;

  const { data, error } = await client
      .from("events")
      .select("*")
      .eq("status", "published")
      .order("date", { ascending: true });

  if (error || !data) {
        console.warn("[supabase] events fetch fallback to mock:", error?.message);
        return MOCK_EVENTS;
  }

  return data.map(rowToEvent);
}

/**
 * トップページ/カレンダー用: 開催日(JST基準)が今日以降(today開催含む)のイベントのみ取得。
 * 過去のイベントはメイン一覧から自動で外れる（データは消さない。表示層のフィルタのみ）。
 * Supabase接続時はDB側の絞り込み(.gte)で取得し、未接続時はモックデータを同条件でフィルタする。
 */
export async function fetchUpcomingEvents(): Promise<DanceEvent[]> {
    const today = getTodayIsoJst();

  if (!client) return filterUpcomingEvents(MOCK_EVENTS);

  const { data, error } = await client
      .from("events")
      .select("*")
      .eq("status", "published")
      .gte("date", today)
      .order("date", { ascending: true });

  if (error || !data) {
        console.warn("[supabase] upcoming events fetch fallback to mock:", error?.message);
        return filterUpcomingEvents(MOCK_EVENTS);
  }

  return data.map(rowToEvent);
}

/**
 * アーカイブページ用: 開催日(JST基準)が今日より前(終了済み)のイベントを、新しい順で取得。
 * データはDB上に残したまま、表示だけをこちらに切り出す。
 */
export async function fetchPastEvents(): Promise<DanceEvent[]> {
    const today = getTodayIsoJst();

  if (!client) return filterPastEventsDesc(MOCK_EVENTS);

  const { data, error } = await client
      .from("events")
      .select("*")
      .eq("status", "published")
      .lt("date", today)
      .order("date", { ascending: false });

  if (error || !data) {
        console.warn("[supabase] past events fetch fallback to mock:", error?.message);
        return filterPastEventsDesc(MOCK_EVENTS);
  }

  return data.map(rowToEvent);
}

export async function fetchEventById(id: string): Promise<DanceEvent | null> {
    if (!client) {
          return MOCK_EVENTS.find((e) => e.id === id) ?? null;
    }

  const { data, error } = await client
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

  if (error || !data) {
        return MOCK_EVENTS.find((e) => e.id === id) ?? null;
  }

  return rowToEvent(data);
}
