import type { DanceEvent } from "@/types/event";

// ISO日付文字列(yyyy-mm-dd)ベースで計算する。既存のscripts/lib/extract.tsのtodayIso()と
// 同様にUTC基準。JSTの深夜帯で1日ずれる可能性はあるが、既存コードの方針に合わせる。
function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
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
  const day = now.getUTCDay(); // 0=日 ... 6=土
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
        e.deadline <= limit,
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}
