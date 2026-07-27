"use client";

import { useMemo, useState } from "react";
import AdminEventCard from "@/components/admin/AdminEventCard";
import BulkEditToolbar from "@/components/admin/BulkEditToolbar";
import { sortEvents, type EventSortKey } from "@/lib/sortEvents";
import type { DanceEvent } from "@/types/event";

interface Props {
  events: DanceEvent[];
}

/**
 * 公開中/却下タブ用のイベント一覧。各カードにチェックボックスを付け、
 * 選択したものへの一括編集(ジャンル変更・画像設定)をまとめて行える。
 */
export default function AdminEventsBoard({ events }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // default = 登録が新しい順(サーバーの取得順)
  const [sort, setSort] = useState<EventSortKey>("default");
  const sorted = useMemo(() => sortEvents(events, sort), [events, sort]);

  const allIds = useMemo(() => events.map((e) => e.id), [events]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-ink/[0.03] p-4">
        <button
          type="button"
          onClick={() =>
            setSelectedIds(allSelected ? new Set() : new Set(allIds))
          }
          className="btn-ghost text-xs"
        >
          {allSelected ? "全解除" : "全選択"}
        </button>
        <span className="text-xs text-ink/60">
          {selectedIds.size}件選択中 / 全{allIds.length}件
        </span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as EventSortKey)}
          className="ml-auto rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-xs"
        >
          <option value="default">登録が新しい順</option>
          <option value="date">開催日が近い順</option>
          <option value="deadline">締切が近い順</option>
        </select>
      </div>

      {selectedIds.size > 0 && (
        <BulkEditToolbar
          selectedIds={Array.from(selectedIds)}
          onDone={() => setSelectedIds(new Set())}
        />
      )}

      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((event) => (
          <div key={event.id} className="relative">
            <label className="absolute left-3 top-3 z-10 flex cursor-pointer items-center gap-1.5 rounded-full bg-paper/90 px-3 py-1.5 text-xs font-bold shadow-card">
              <input
                type="checkbox"
                checked={selectedIds.has(event.id)}
                onChange={() => toggleOne(event.id)}
              />
              選択
            </label>
            <AdminEventCard event={event} />
          </div>
        ))}
      </div>
    </div>
  );
}
