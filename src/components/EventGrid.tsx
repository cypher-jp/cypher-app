"use client";

import { useMemo, useState } from "react";
import EventCard from "@/components/EventCard";
import FilterBar, { DEFAULT_FILTER, type FilterState } from "@/components/FilterBar";
import type { DanceEvent } from "@/types/event";

interface Props {
  events: DanceEvent[];
}

export default function EventGrid({ events }: Props) {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  const filtered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    return events.filter((e) => {
      if (filter.type !== "any" && e.type !== filter.type) return false;
      if (filter.genre !== "any" && e.genre !== filter.genre) return false;
      if (filter.region !== "any" && e.region !== filter.region) return false;
      if (q) {
        const haystack = `${e.title} ${e.venue} ${e.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, filter]);

  return (
    <div className="flex flex-col gap-8">
      <FilterBar value={filter} onChange={setFilter} resultCount={filtered.length} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-paper p-12 text-center">
          <div className="display text-2xl font-black">NO MATCH</div>
          <p className="mt-2 text-sm text-ink/60">
            条件を緩めると見つかるかも。フィルタをリセットしてみて。
          </p>
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
