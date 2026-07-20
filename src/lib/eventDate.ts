/**
 * イベントの開催日(date)がJST(日本標準時, UTC+9固定)基準で
 * 「今日以降(開催中含む)」か「今日より前(終了済み)」かを判定するユーティリティ。
 *
 * サイトの主要ユーザーは日本のため、鮮度判定(自動アーカイブ)はJST基準に統一する。
 * ※ src/lib/featured.ts の todayIso() はUTC基準（既存の週末/締切ロジック用、変更しない）。
 *   こちらは新規の「過去/未来」判定専用のため、featured.ts とは別関数として持つ。
 *
 * DBの date 列・DanceEvent.date は "yyyy-mm-dd" の文字列(タイムゾーン情報なし)なので、
 * 文字列比較でそのまま前後判定できる。
 */

/** JST基準での「今日」を yyyy-mm-dd 文字列で返す */
export function getTodayIsoJst(now: Date = new Date()): string {
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().slice(0, 10);
}

/** 開催日(yyyy-mm-dd)がJST基準で今日より前(=終了済み)かどうか */
export function isPastEvent(dateIso: string, now: Date = new Date()): boolean {
    return dateIso < getTodayIsoJst(now);
}

/** 開催日(yyyy-mm-dd)がJST基準で今日以降(=開催中・開催予定)かどうか */
export function isUpcomingEvent(dateIso: string, now: Date = new Date()): boolean {
    return dateIso >= getTodayIsoJst(now);
}

/** 開催予定(今日開催を含む)のイベントだけを残す。日付の昇順は呼び出し側の並びを維持する。 */
export function filterUpcomingEvents<T extends { date: string }>(
    events: T[],
    now: Date = new Date(),
  ): T[] {
    const today = getTodayIsoJst(now);
    return events.filter((e) => e.date >= today);
}

/** 終了済みのイベントだけを、開催日が新しい順(降順)で返す */
export function filterPastEventsDesc<T extends { date: string }>(
    events: T[],
    now: Date = new Date(),
  ): T[] {
    const today = getTodayIsoJst(now);
    return events
      .filter((e) => e.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));
}
