import type { DanceEvent } from "@/types/event";

/**
 * 並び替えキー。
 * - date: 開催日が近い順
 * - deadline: エントリー締切が近い順(締切なしは後ろへ、同着は開催日順)
 * - default: 取得時の並びのまま(公開側=開催日順 / 管理画面=登録が新しい順)
 */
export type EventSortKey = "default" | "date" | "deadline";

export function sortEvents(
  events: DanceEvent[],
  key: EventSortKey,
): DanceEvent[] {
  if (key === "default") return events;
  const arr = [...events];
  if (key === "date") {
    arr.sort((a, b) => a.date.localeCompare(b.date));
  } else {
    arr.sort((a, b) => {
      const ad = a.deadline;
      const bd = b.deadline;
      if (!ad && !bd) return a.date.localeCompare(b.date);
      if (!ad) return 1;
      if (!bd) return -1;
      return ad.localeCompare(bd) || a.date.localeCompare(b.date);
    });
  }
  return arr;
}
