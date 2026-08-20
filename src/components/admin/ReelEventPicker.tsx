"use client";

import { useMemo, useState } from "react";
import { ADMIN_GENRE_LABEL, ADMIN_REGION_LABEL } from "@/lib/admin/labels";
import { GENRES, getEventGenres, type DanceEvent, type Genre } from "@/types/event";

type Candidate = Pick<
  DanceEvent,
  "id" | "title" | "date" | "endDate" | "type" | "genre" | "genres" | "region" | "venue" | "flyerUrl"
> & {
  isNew: boolean;
  isPast: boolean;
};

interface Props {
  events: Candidate[];
  maxSelect: number;
}

type Scope = "new" | "thisWeek" | "thisMonth" | "upcoming" | "past" | "all";

const SCOPE_LABEL: Record<Scope, string> = {
  new: "新着(7日以内)",
  thisWeek: "今週開催",
  thisMonth: "今月開催",
  upcoming: "今後のイベント",
  past: "過去のイベント",
  all: "すべて",
};

/** YYYY-MM-DD 同士の比較で「開催期間が[from,to]と重なるか」を判定 */
function overlaps(e: { date: string; endDate?: string }, from: string, to: string): boolean {
  const start = e.date;
  const end = e.endDate && e.endDate > e.date ? e.endDate : e.date;
  return start <= to && end >= from;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Reels に載せるイベントを選ぶチェックリスト。
 * 範囲(新着/今後/過去/すべて) × ジャンル で絞り込める。初期値は新着(上限まで)。
 * フォーム送信は親の <form> が行う(name="event_ids")。
 */
export default function ReelEventPicker({ events, maxSelect }: Props) {
  const initial = useMemo(
    () => new Set(events.filter((e) => e.isNew && e.flyerUrl).slice(0, maxSelect).map((e) => e.id)),
    [events, maxSelect],
  );
  const [selected, setSelected] = useState<Set<string>>(initial);
  const [scope, setScope] = useState<Scope>("new");
  const [genre, setGenre] = useState<Genre | "all">("all");
  const [withFlyerOnly, setWithFlyerOnly] = useState(true);

  function matches(e: Candidate): boolean {
    const now = new Date();
    const today = ymd(now);
    if (scope === "new" && !e.isNew) return false;
    if (scope === "thisWeek") {
      const weekEnd = ymd(new Date(now.getTime() + 6 * 86400 * 1000));
      if (!overlaps(e, today, weekEnd)) return false;
    }
    if (scope === "thisMonth") {
      const monthStart = `${today.slice(0, 7)}-01`;
      const monthEnd = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      if (!overlaps(e, monthStart, monthEnd)) return false;
    }
    if (scope === "upcoming" && e.isPast) return false;
    if (scope === "past" && !e.isPast) return false;
    if (genre !== "all" && !getEventGenres(e).includes(genre)) return false;
    if (withFlyerOnly && !e.flyerUrl) return false;
    return true;
  }

  const filtered = events.filter(matches);
  // 選択済みは絞り込みから外れても常に見えるようにする(誤爆防止)
  const visible = [...filtered, ...events.filter((e) => selected.has(e.id) && !filtered.includes(e))];

  const full = selected.size >= maxSelect;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxSelect) next.add(id);
      return next;
    });
  }

  function selectFiltered() {
    setSelected(new Set(filtered.slice(0, maxSelect).map((e) => e.id)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-ink/60">範囲</span>
        {(Object.keys(SCOPE_LABEL) as Scope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`chip ${scope === s ? "bg-ink text-paper" : "chip-outline"}`}
          >
            {SCOPE_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-ink/60">ジャンル</span>
        <button
          type="button"
          onClick={() => setGenre("all")}
          className={`chip ${genre === "all" ? "bg-ink text-paper" : "chip-outline"}`}
        >
          すべて
        </button>
        {GENRES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGenre(g)}
            className={`chip ${genre === g ? "bg-ink text-paper" : "chip-outline"}`}
          >
            {ADMIN_GENRE_LABEL[g]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          選択中 <span className="font-bold">{selected.size}</span> / {maxSelect} 件
          <span className="ml-3 text-ink/60">(絞り込み結果 {filtered.length} 件)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-ink/70">
            <input
              type="checkbox"
              checked={withFlyerOnly}
              onChange={(e) => setWithFlyerOnly(e.target.checked)}
            />
            画像ありのみ
          </label>
          <button type="button" className="btn-ghost text-xs" onClick={selectFiltered}>
            絞り込み結果を選択
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={() => setSelected(new Set())}>
            全解除
          </button>
        </div>
      </div>

      <ul className="mt-3 max-h-[32rem] divide-y divide-ink/10 overflow-y-auto rounded-2xl border border-ink/10 bg-white">
        {visible.length === 0 && (
          <li className="px-4 py-6 text-sm text-ink/60">
            この条件に合うイベントがありません。範囲やジャンルを変えてみてください。
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
                  <div className="flex h-12 w-9 items-center justify-center rounded bg-ink/10 text-[9px] text-ink/50">
                    画像なし
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {e.title}
                    {e.isNew && (
                      <span className="ml-2 rounded-full bg-cypher-yellow px-2 py-0.5 text-[10px] font-black">
                        NEW
                      </span>
                    )}
                    {e.isPast && (
                      <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-ink/60">
                        終了
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
