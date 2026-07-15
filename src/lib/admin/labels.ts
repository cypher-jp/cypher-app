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
  hokkaido: "北海道",
  miyagi: "宮城",
  tohoku: "東北（その他）",
  tokyo: "東京",
  kanagawa: "神奈川",
  chiba: "千葉",
  saitama: "埼玉",
  kanto: "関東（その他）",
  niigata: "新潟",
  hokuriku: "北陸・甲信越（その他）",
  aichi: "愛知",
  tokai: "東海（その他）",
  kyoto: "京都",
  osaka: "大阪",
  kansai: "関西（その他）",
  hiroshima: "広島",
  chugoku: "中国（その他）",
  shikoku: "四国",
  fukuoka: "福岡",
  kyushu: "九州・沖縄（その他）",
  online: "オンライン",
  seoul: "ソウル",
  busan: "釜山",
  korea: "韓国（その他）",
  taipei: "台北",
  taiwan: "台湾（その他）",
  shanghai: "上海",
  beijing: "北京",
  chengdu: "成都",
  asia: "アジア（その他）",
  newyork: "ニューヨーク",
  losangeles: "ロサンゼルス",
  us: "アメリカ（その他）",
  paris: "パリ",
  amsterdam: "アムステルダム",
  berlin: "ベルリン",
  eu: "ヨーロッパ（その他）",
  other: "その他",
};

export const ADMIN_STATUS_LABEL: Record<EventStatus, string> = {
  pending: "承認待ち",
  published: "公開中",
  draft: "却下/下書き",
};
