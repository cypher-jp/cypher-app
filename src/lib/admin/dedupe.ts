import type { DanceEvent } from "@/types/event";

/**
 * タイトルを比較用に正規化する。
 * - Unicode正規化(NFKC)で全角/半角の表記ゆれを吸収(「２０２６」→「2026」等)
 * - 大文字/小文字を統一
 * - 空白・記号・句読点(！?・-「」『』()（）等)を除去し、表記ゆれに強くする
 *   (絵文字・記号系(\p{S})と句読点系(\p{P})、あらゆる空白(\s)を落とす)
 */
export function normalizeEventTitle(title: string): string {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

/**
 * 「同一イベントらしき行」を束ねるための重複判定キー。
 * 推奨判定: 開催日が同じ AND タイトルの正規化一致。
 */
export function buildDedupeKey(
  event: Pick<DanceEvent, "date" | "title">,
): string {
  return `${event.date}::${normalizeEventTitle(event.title)}`;
}

/**
 * 情報量スコア。フライヤーの有無を最優先し、次に説明文・エントリーURL・
 * Instagram投稿URL・締切・会場の有無を加点する。
 * グループ内の代表(primary)イベント選出に使う。
 */
function eventInfoScore(event: DanceEvent): number {
  let score = 0;
  if (event.flyerUrl) score += 100;
  if (event.venue && event.venue.trim().length > 0) score += 10;
  if (event.description && event.description.trim().length > 10) score += 10;
  if (event.entryUrl) score += 5;
  if (event.igPostUrl) score += 5;
  if (event.deadline) score += 3;
  score += Math.min(event.description?.length ?? 0, 400) / 100;
  return score;
}

export interface PendingEventGroup {
  /** グループの重複判定キー(開催日::正規化タイトル) */
  key: string;
  /** 代表として表示するイベント(情報量が最も多いもの) */
  primary: DanceEvent;
  /** 同一イベントとみなした残りの行(承認待ちの他ソース由来など) */
  others: DanceEvent[];
}

/**
 * 承認待ちイベントを「同一イベントらしき行」でグループ化する。
 *
 * 判定基準: 開催日が同じ AND タイトルの正規化一致
 * (大文字小文字・全角半角・空白・記号のゆれは吸収する)。
 *
 * グループの代表(primary)は情報量スコアが最も高い行
 * (フライヤーがある方を最優先、次に説明文/URL等の情報量)。
 */
export function groupPendingEvents(events: DanceEvent[]): PendingEventGroup[] {
  const map = new Map<string, DanceEvent[]>();
  for (const event of events) {
    const key = buildDedupeKey(event);
    const list = map.get(key);
    if (list) {
      list.push(event);
    } else {
      map.set(key, [event]);
    }
  }

  return Array.from(map.entries()).map(([key, list]) => {
    if (list.length === 1) {
      return { key, primary: list[0], others: [] };
    }
    const sorted = [...list].sort(
      (a, b) => eventInfoScore(b) - eventInfoScore(a),
    );
    return { key, primary: sorted[0], others: sorted.slice(1) };
  });
}
