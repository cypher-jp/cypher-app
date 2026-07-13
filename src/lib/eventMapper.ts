import { I18N_LOCALES, type DanceEvent } from "@/types/event";

// description_i18n(jsonb) を安全にパースする。想定外の形(null/文字列以外の値等)は無視する。
function parseDescriptionI18n(value: unknown): DanceEvent["descriptionI18n"] {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const result: DanceEvent["descriptionI18n"] = {};
  for (const locale of I18N_LOCALES) {
    const translated = source[locale];
    if (typeof translated === "string" && translated.trim()) {
      result[locale] = translated;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// SupabaseのDBスキーマ(snake_case) → アプリの型(camelCase) に変換。
// 公開側(src/lib/supabase.ts)と管理画面側(src/lib/admin/events.ts)の両方から使う共通ロジック。
export function rowToEvent(row: Record<string, unknown>): DanceEvent {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    type: (row.type as DanceEvent["type"]) ?? "battle",
    genre: (row.genre as DanceEvent["genre"]) ?? "all",
    region: (row.region as DanceEvent["region"]) ?? "other",
    date: String(row.date ?? ""),
    deadline: row.deadline ? String(row.deadline) : undefined,
    venue: String(row.venue ?? ""),
    description: String(row.description ?? ""),
    descriptionI18n: parseDescriptionI18n(row.description_i18n),
    flyerUrl: row.flyer_url ? String(row.flyer_url) : undefined,
    igHandle: row.ig_handle ? String(row.ig_handle) : undefined,
    igPostUrl: row.ig_post_url ? String(row.ig_post_url) : undefined,
    entryUrl: row.entry_url ? String(row.entry_url) : undefined,
    status: (row.status as DanceEvent["status"]) ?? "published",
    source: row.source ? String(row.source) : undefined,
  };
}
