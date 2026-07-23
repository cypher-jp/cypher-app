import type { FilterState } from "@/components/FilterBar";
import { matchesRegionFilter, type DanceEvent } from "@/types/event";

/** EventGrid・CalendarView共通のフィルタ適用ロジック。 */
export function filterEvents(events: DanceEvent[], filter: FilterState): DanceEvent[] {
  const q = filter.query.trim().toLowerCase();
  return events.filter((e) => {
    if (filter.type !== "any" && e.type !== filter.type) return false;
    if (filter.genre !== "any" && e.genre !== filter.genre) return false;
    if (!matchesRegionFilter(e.region, filter.region)) return false;
    if (q) {
      const haystack = `${e.title} ${e.venue} ${e.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
