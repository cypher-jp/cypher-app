import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { DanceEvent } from "@/types/event";
import { MOCK_EVENTS } from "@/lib/mockEvents";
import { rowToEvent } from "@/lib/eventMapper";

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
