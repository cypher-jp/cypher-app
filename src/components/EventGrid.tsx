"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import EventCard from "@/components/EventCard";
import FilterBar, { DEFAULT_FILTER, type FilterState } from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import { filterEvents } from "@/lib/filterEvents";
import { sortEvents, type EventSortKey } from "@/lib/sortEvents";
import type { DanceEvent, EventType } from "@/types/event";

const PAGE_SIZE = 12;

interface Props {
  events: DanceEvent[];
  initialType?: EventType | "any";
}

export default function EventGrid({ events, initialType = "battle" }: Props) {
  const t = useTranslations("grid");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState<FilterState>({
    ...DEFAULT_FILTER,
    type: initialType,
  });

  // フィルタ変更時にURLクエリ(?type=...)も更新して、共有可能なリンクにする。
  const handleChange = useCallback(
    (next: FilterState) => {
      setFilter(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next.type === "any") {
        params.delete("type");
      } else {
        params.set("type", next.type);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const filtered = useMemo(() => filterEvents(events, filter), [events, filter]);

  // 並び替え(デフォルトは開催日が近い順=取得時の並び)
  const [sort, setSort] = useState<EventSortKey>("date");
  const sorted = useMemo(() => sortEvents(filtered, sort), [filtered, sort]);

  const [page, setPage] = useState(1);
  const gridTopRef = useRef<HTMLDivElement>(null);

  // フィルタ結果が変わったら1ページ目に戻す(古いフィルタでのページ番号のまま残らないように)。
  useEffect(() => {
    setPage(1);
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div ref={gridTopRef} className="flex flex-col gap-8">
      <FilterBar value={filter} onChange={handleChange} resultCount={filtered.length} />

      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-xs text-ink/60">
          {t("sort")}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as EventSortKey)}
            className="rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-xs focus:border-ink focus:outline-none"
          >
            <option value="date">{t("sortDate")}</option>
            <option value="deadline">{t("sortDeadline")}</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-paper p-12 text-center">
          <div className="display text-2xl font-black">{t("noMatchTitle")}</div>
          <p className="mt-2 text-sm text-ink/60">{t("noMatchBody")}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
