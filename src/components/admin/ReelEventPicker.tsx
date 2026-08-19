"use client";

import { useMemo, useState } from "react";
import { ADMIN_REGION_LABEL } from "@/lib/admin/labels";
import type { DanceEvent } from "@/types/event";

type Candidate = Pick<DanceEvent, "id" | "title" | "date" | "endDate" | "type" | "region" | "venue" | "flyerUrl"> & {
  isNew: boolean;
};

interface Props {
  events: Candidate[];
  maxSelect: number;
}

/**
 * Reels に載せるイベントを選ぶチェックリスト。初期値は「直近7日以内に登録された新着」(上限まで)。
 * フォーム送信は親の <form> が行う(name="event_ids")。
 */
export default function ReelEventPicker({ events, maxSelect }: Props) {
  const initial = useMemo(
    () => new Set(events.filter((e) => e.isNew).slice(0, maxSelect).map((e) => e.id)),
    [events, maxSelect],
  );
  const [selected, setSelected] = useState<Set<string>>(initial);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? events : events.filter((e) => e.isNew || selected.has(e.id));
  const newCount = events.filter((e) => e.isNew).length;
  const full = selected.size >= maxSelect;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxSelect) next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          選択中 <span className="font-bold">{selected.size}</span> / {maxSelect} 件
          <span className="ml-3 text-ink/60">(新着 {newCount} 件 / 今後のイベント {events.length} 件)</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setSelected(new Set(events.filter((e) => e.isNew).slice(0, maxSelect).map((e) => e.id)))}
          >
            新着を選択
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={() => setSelected(new Set())}>
            全解除
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "新着のみ表示" : "すべて表示"}
          </button>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
        {visible.length === 0 && (
          <li className="px-4 py-6 text-sm text-ink/60">
            直近7日以内に登録された新着イベントはありません。「すべて表示」から選んでください。
          </li>
        )}
        {visible.map((e) => {
          const checked = selected.has(e.id);
          const disabled = !checked && full;
          return (
            <li key={e.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${disabled ? "opacity-40" : ""}`}
              >
                <input
                  type="checkbox"
                  name="event_ids"
                  value={e.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(e.id)}
                  className="h-4 w-4"
                />
                {e.flyerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.flyerUrl} alt="" className="h-12 w-9 rounded object-cover" />
                ) : (
                  <div className="h-12 w-9 rounded bg-ink/10" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {e.title}
                    {e.isNew && (
                      <span className="ml-2 rounded-full bg-cypher-yellow px-2 py-0.5 text-[10px] font-black">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-ink/60">
                    {e.date}
                    {e.endDate && e.endDate !== e.date ? ` – ${e.endDate}` : ""} ・ {e.type.toUpperCase()} ・{" "}
                    {ADMIN_REGION_LABEL[e.region] ?? e.region}
                    {e.venue ? ` ・ ${e.venue}` : ""}
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
