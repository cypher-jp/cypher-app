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
  status?: "published" | "pending" | "draft";
  source?: string;          // どこから取得したか
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  battle: "BATTLE",
  showcase: "SHOWCASE",
  workshop: "WORKSHOP",
  audition: "AUDITION",
  festival: "FESTIVAL",
};

export const GENRE_LABEL: Record<Genre, string> = {
  hiphop: "Hip Hop",
  house: "House",
  popping: "Popping",
  locking: "Locking",
  breaking: "Breaking",
  waacking: "Waacking",
  krump: "Krump",
  jazz: "Jazz",
  all: "ALL STYLE",
};

export const REGION_LABEL: Record<Region, string> = {
  tokyo: "東京",
  osaka: "大阪",
  nagoya: "名古屋",
  fukuoka: "福岡",
  sapporo: "札幌",
  okinawa: "沖縄",
  korea: "韓国",
  taiwan: "台湾",
  us: "アメリカ",
  eu: "ヨーロッパ",
  other: "その他",
};
