"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import EventCard from "@/components/EventCard";
import FilterBar, { DEFAULT_FILTER, type FilterState } from "@/components/FilterBar";
import { matchesRegionFilter, type DanceEvent, type EventType } from "@/types/event";

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

  const filtered = useMemo(() => {
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
  }, [events, filter]);

  return (
    <div className="flex flex-col gap-8">
      <FilterBar value={filter} onChange={handleChange} resultCount={filtered.length} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-paper p-12 text-center">
          <div className="display text-2xl font-black">{t("noMatchTitle")}</div>
          <p className="mt-2 text-sm text-ink/60">{t("noMatchBody")}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
