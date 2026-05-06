"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DanceEvent } from "@/types/event";
import { EVENT_TYPE_LABEL } from "@/types/event";

const TYPE_DOT: Record<DanceEvent["type"], string> = {
  battle: "bg-cypher-red",
  showcase: "bg-cypher-navy",
  workshop: "bg-cypher-green",
  audition: "bg-ink",
  festival: "bg-cypher-yellow",
};

interface Props {
  events: DanceEvent[];
}

export default function CalendarView({ events }: Props) {
  const today = new Date();
  const initial = events.length > 0 ? new Date(events[0].date) : today;
  const [cursor, setCursor] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1),
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DanceEvent[]>();
    for (const e of events) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => buildMonthCells(cursor), [cursor]);
  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prev = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const next = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5 shadow-card md:p-8">
      <div className="flex items-center justify-between">
        <div className="display text-2xl font-black md:text-3xl">
          {monthLabel}
        </div>
        <div className="flex gap-2">
          <button onClick={prev} className="btn-ghost">
            ← Prev
          </button>
          <button onClick={next} className="btn-ghost">
            Next →
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-ink/15 bg-ink/15 text-xs">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <div
            key={d}
            className="bg-ink py-2 text-center font-bold uppercase tracking-widest text-paper"
          >
            {d}
          </div>
        ))}
        {cells.map((cell, idx) => {
          const key = cell
            ? `${cell.getFullYear()}-${cell.getMonth()}-${cell.getDate()}`
            : `pad-${idx}`;
          const dayEvents = cell ? eventsByDay.get(key) ?? [] : [];
          const isToday =
            cell &&
            cell.getFullYear() === today.getFullYear() &&
            cell.getMonth() === today.getMonth() &&
            cell.getDate() === today.getDate();

          return (
            <div
              key={key}
              className={`min-h-[88px] bg-paper p-2 ${
                cell ? "" : "opacity-40"
              }`}
            >
              {cell && (
                <>
                  <div
                    className={`display text-sm font-black ${
                      isToday ? "text-cypher-red" : "text-ink"
                    }`}
                  >
                    {cell.getDate()}
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <Link
                        key={e.id}
                        href={`/events/${e.id}`}
                        className="group flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] hover:bg-ink hover:text-paper"
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[e.type]}`}
                        />
                        <span className="truncate font-bold">
                          {e.title}
                        </span>
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="px-1 text-[10px] text-ink/50">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-[11px]">
        {(Object.keys(TYPE_DOT) as DanceEvent["type"][]).map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${TYPE_DOT[t]}`} />
            <span className="font-bold uppercase tracking-widest text-ink/70">
              {EVENT_TYPE_LABEL[t]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 月初の前埋め + 月の日付配列 を返す（最大6行 × 7列）
function buildMonthCells(cursor: Date): (Date | null)[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
