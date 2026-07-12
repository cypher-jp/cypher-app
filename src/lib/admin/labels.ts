import type { EventType, Genre, Region, EventStatus } from "@/types/event";

// 管理画面は日本語のみ(i18nルーティング対象外)なので、固定の日本語ラベルを使う。
export const ADMIN_EVENT_TYPE_LABEL: Record<EventType, string> = {
  battle: "BATTLE",
  showcase: "SHOWCASE",
  workshop: "WORKSHOP",
  audition: "AUDITION",
  festival: "FESTIVAL",
};

export const ADMIN_GENRE_LABEL: Record<Genre, string> = {
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

export const ADMIN_REGION_LABEL: Record<Region, string> = {
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

export const ADMIN_STATUS_LABEL: Record<EventStatus, string> = {
  pending: "承認待ち",
  published: "公開中",
  draft: "却下/下書き",
};
