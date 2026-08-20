/** Remotion 側に渡すイベント1件分のデータ。DB(events)から render スクリプトが整形して渡す。 */
export type ReelEvent = {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  endDate?: string | null;
  /** battle / contest / showcase ... (表示用に大文字化して使う) */
  type: string;
  genres: string[];
  /** 表示用エリア名 (例: "TOKYO", "OSAKA", "SEOUL", "ONLINE") */
  region: string;
  venue?: string | null;
  /** 公開URL (https://...) */
  flyerUrl?: string | null;
  format?: string | null;
  entryFee?: string | null;
};

/** 動画デザイン。classic=現行(黒ベース) / light=白ベース */
export type ReelTemplate = "classic" | "light";

export type ReelProps = {
  events: ReelEvent[];
  /** デザインテンプレート(省略時 classic) */
  template?: ReelTemplate;
  /** 見出し (例: "NEW EVENTS") */
  headline: string;
  /** サブ見出し (例: "THIS WEEK · AUG 19 – 25") */
  subline: string;
  siteUrl: string;
  /** 1イベントあたりの秒数 */
  secondsPerEvent: number;
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const OPENING_SECONDS = 2.4;
export const CTA_SECONDS = 2.6;

export function totalFrames(props: Pick<ReelProps, "events" | "secondsPerEvent">): number {
  const n = Math.max(1, props.events.length);
  return Math.round((OPENING_SECONDS + n * props.secondsPerEvent + CTA_SECONDS) * FPS);
}
