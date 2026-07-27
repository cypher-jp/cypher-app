import type { FilterState } from "@/components/FilterBar";
import {
  DOMESTIC_REGIONS,
  OVERSEAS_REGIONS,
  getEventGenres,
  matchesRegionFilter,
  type DanceEvent,
} from "@/types/event";

/**
 * EventGrid・CalendarView共通のフィルタ適用ロジック。
 * - ジャンル: 複数選択(OR)。厳密一致のみ。"all"(ALL STYLE)や"freestyle"も通常ジャンルとして扱い、
 *   旧仕様の「allはどのジャンルで絞ってもヒット」は廃止。
 * - エリア: チップ選択(複数・OR)があればそれを優先。チップ未選択で国内/海外スコープが
 *   有効なら、その側の全エリアにマッチ(onlineはどちらにも含まれない)。
 */
export function filterEvents(events: DanceEvent[], filter: FilterState): DanceEvent[] {
  const q = filter.query.trim().toLowerCase();
  return events.filter((e) => {
    if (filter.type !== "any" && e.type !== filter.type) return false;

    if (filter.genres.length > 0) {
      const genres = getEventGenres(e);
      if (!filter.genres.some((g) => genres.includes(g))) return false;
    }

    if (filter.regions.length > 0) {
      if (!filter.regions.some((r) => matchesRegionFilter(e.region, r))) {
        return false;
      }
    } else if (filter.regionScope === "domestic") {
      if (!(DOMESTIC_REGIONS as readonly string[]).includes(e.region)) return false;
    } else if (filter.regionScope === "overseas") {
      if (!(OVERSEAS_REGIONS as readonly string[]).includes(e.region)) return false;
    }

    if (q) {
      const haystack = `${e.title} ${e.venue} ${e.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
