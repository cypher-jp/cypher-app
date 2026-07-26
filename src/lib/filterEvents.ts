import type { FilterState } from "@/components/FilterBar";
import { getEventGenres, matchesRegionFilter, type DanceEvent } from "@/types/event";
 
/** EventGrid・CalendarView共通のフィルタ適用ロジック。 */
export function filterEvents(events: DanceEvent[], filter: FilterState): DanceEvent[] {
  const q = filter.query.trim().toLowerCase();
  return events.filter((e) => {
    if (filter.type !== "any" && e.type !== filter.type) return false;
    // ジャンル判定: genres(部門制の大会が持つ複数ジャンル)で判定する。
    // "all" = FREESTYLE/ALL STYLE と明記された大会で、どのジャンルで絞ってもヒットさせる。
    // 部門制の大会(例: POPPING部門+LOCKING部門)は列挙された各ジャンルでのみヒットする。
    if (filter.genre !== "any") {
      const genres = getEventGenres(e);
      if (!genres.includes(filter.genre) && !genres.includes("all")) return false;
    }
    if (!matchesRegionFilter(e.region, filter.region)) return false;
    if (q) {
      const haystack = `${e.title} ${e.venue} ${e.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
 
