import type { DanceEvent } from "@/types/event";
import { getTodayIsoJst } from "@/lib/eventDate";

// ISO日付文字列(yyyy-mm-dd)ベースで計算する。
// 以前はUTC基準だったが、JSTの深夜0時〜朝9時の間に「前日に締切が過ぎたイベント」が
// 締切間近枠へ残り続ける不具合があったため、開催日の判定(eventDate.ts)と同じ
// JST基準へ統一した(2026-07-26)。
function todayIso(now: Date): string {
  return getTodayIsoJst(now);
}

/** JST基準の曜日(0=日 ... 6=土) */
function dayOfWeekJst(now: Date): number {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCDay();
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 直近の週末(土・日)の日付範囲を返す。
 * 土曜日なら今日〜明日、日曜日なら今日のみ、それ以外は次の土曜〜日曜。
 */
export function getWeekendRange(now: Date): { start: string; end: string } {
  const today = todayIso(now);
  const day = dayOfWeekJst(now); // 0=日 ... 6=土(JST基準)
  if (day === 6) return { start: today, end: addDaysIso(today, 1) };
  if (day === 0) return { start: today, end: today };
  const daysUntilSaturday = 6 - day;
  const start = addDaysIso(today, daysUntilSaturday);
  return { start, end: addDaysIso(start, 1) };
}

/** 今週末開催のバトルを日付順で返す */
export function getWeekendBattles(
  events: DanceEvent[],
  now: Date = new Date(),
): DanceEvent[] {
  const { start, end } = getWeekendRange(now);
  return events
    .filter((e) => e.type === "battle" && e.date >= start && e.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** エントリー締切が指定日数以内に迫っているイベントを締切が近い順で返す */
export function getUpcomingDeadlines(
  events: DanceEvent[],
  withinDays = 7,
  now: Date = new Date(),
): DanceEvent[] {
  const today = todayIso(now);
  const limit = addDaysIso(today, withinDays);
  return events
    .filter(
      (e): e is DanceEvent & { deadline: string } =>
        typeof e.deadline === "string" &&
        e.deadline >= today &&
        e.deadline <= limit &&
        // adminで「締め切りました」を押されたイベントは締切日前でも枠から外す
        e.entryClosed !== true,
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}
