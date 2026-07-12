export type EventType =
  | "battle"
  | "showcase"
  | "workshop"
  | "audition"
  | "festival";

export type Genre =
  | "hiphop"
  | "house"
  | "popping"
  | "locking"
  | "breaking"
  | "waacking"
  | "krump"
  | "jazz"
  | "all";

export type Region =
  | "tokyo"
  | "osaka"
  | "nagoya"
  | "fukuoka"
  | "sapporo"
  | "okinawa"
  | "korea"
  | "taiwan"
  | "us"
  | "eu"
  | "other";

export type EventStatus = "published" | "pending" | "draft";

export interface DanceEvent {
  id: string;
  title: string;
  type: EventType;
  genre: Genre;
  region: Region;
  date: string;             // ISO yyyy-mm-dd
  deadline?: string;        // 申し込み締切
  venue: string;
  description: string;
  flyerUrl?: string;
  igHandle?: string;        // @なし
  igPostUrl?: string;
  entryUrl?: string;
  status?: EventStatus;
  source?: string;          // どこから取得したか
}

export const EVENT_TYPES: EventType[] = [
  "battle",
  "showcase",
  "workshop",
  "audition",
  "festival",
];

export const GENRES: Genre[] = [
  "hiphop",
  "house",
  "popping",
  "locking",
  "breaking",
  "waacking",
  "krump",
  "jazz",
  "all",
];

export const REGIONS: Region[] = [
  "tokyo",
  "osaka",
  "nagoya",
  "fukuoka",
  "sapporo",
  "okinawa",
  "korea",
  "taiwan",
  "us",
  "eu",
  "other",
];

export const EVENT_STATUSES: EventStatus[] = ["pending", "published", "draft"];

/**
 * next-intl の useTranslations("labels.eventType") 等から得た翻訳関数を渡すと、
 * 型安全な Record<EventType, string> を組み立てる。
 * ブランド上の種別名（BATTLE 等）は全言語共通で英語のまま運用する。
 */
export function buildEventTypeLabels(
  t: (key: EventType) => string,
): Record<EventType, string> {
  return {
    battle: t("battle"),
    showcase: t("showcase"),
    workshop: t("workshop"),
    audition: t("audition"),
    festival: t("festival"),
  };
}

export function buildGenreLabels(
  t: (key: Genre) => string,
): Record<Genre, string> {
  return {
    hiphop: t("hiphop"),
    house: t("house"),
    popping: t("popping"),
    locking: t("locking"),
    breaking: t("breaking"),
    waacking: t("waacking"),
    krump: t("krump"),
    jazz: t("jazz"),
    all: t("all"),
  };
}

export function buildRegionLabels(
  t: (key: Region) => string,
): Record<Region, string> {
  return {
    tokyo: t("tokyo"),
    osaka: t("osaka"),
    nagoya: t("nagoya"),
    fukuoka: t("fukuoka"),
    sapporo: t("sapporo"),
    okinawa: t("okinawa"),
    korea: t("korea"),
    taiwan: t("taiwan"),
    us: t("us"),
    eu: t("eu"),
    other: t("other"),
  };
}
