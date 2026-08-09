
export type EventType =
  | "battle"
  // contest = 事前審査/作品披露・採点型のコンテスト大会(バトル形式ではないもの)
  | "contest"
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
  // freestyle = 「FREESTYLE / フリースタイルバトル」表記のジャンル不問バトル。
  // all = 「ALL STYLE / オールスタイル」と明記された大会のみ。フィルタではどちらも厳密一致
  // (旧仕様の「allはどのジャンルで絞ってもヒット」は廃止)。
  | "freestyle"
  | "all";
 
// ダンスシーンが盛んな主要13都道府県は個別キー、それ以外は地方ブロックでまとめる方式。
// 例: 関東ブロック(kanto)は東京/神奈川/千葉/埼玉/茨城を除いた栃木・群馬が該当。
// et-stage側は都道府県で情報を持っているため、抽出時に都道府県→この区分へ変換する。
// 詳細は docs/STATUS_AND_NEXT.md の T1 を参照。
export type Region =
  // 個別化した主要都道府県（北から順）
  | "hokkaido"
  | "miyagi"
  | "tokyo"
  | "kanagawa"
  | "chiba"
  | "saitama"
  | "ibaraki"
  | "niigata"
  | "aichi"
  | "kyoto"
  | "osaka"
  | "hiroshima"
  | "fukuoka"
  // 上記を除いた地方ブロック（「その他」扱い）
  | "tohoku"
  | "kanto"
  | "hokuriku"
  | "tokai"
  | "kansai"
  | "chugoku"
  | "shikoku"
  | "kyushu"
  | "okinawa"
  // 国内以外
  | "online"
  // 海外は主要都市を個別キー、それ以外は国・大陸単位の「その他」ブロックでまとめる
  // （日本と同じ考え方）。例: korea は個別化したソウル・釜山を除いた韓国その他。
  | "seoul"
  | "busan"
  | "korea"
  | "taipei"
  | "taiwan"
  | "shanghai"
  | "beijing"
  | "chengdu"
  | "china"
  | "hongkong"
  | "vietnam"
  | "thailand"
  | "indonesia"
  | "philippines"
  | "malaysia"
  | "singapore"
  | "india"
  | "asia"
  | "australia"
  | "newzealand"
  | "newyork"
  | "losangeles"
  | "us"
  | "canada"
  | "mexico"
  | "brazil"
  | "southamerica"
  | "middleeast"
  | "morocco"
  | "africa"
  // ヨーロッパは「国＋首都」の2階層。国キーは首都以外の開催地または国名までしか
  // 分からない場合に使い、首都開催と判明している場合は首都キーを使う。
  // 対応国リストに無いヨーロッパの国は eu（ヨーロッパその他）に丸める。
  // 首都キー(paris/amsterdam/berlin)は旧バージョンからの互換のため元の位置にも残置。
  | "france"
  | "paris"
  | "germany"
  | "berlin"
  | "netherlands"
  | "amsterdam"
  | "belgium"
  | "brussels"
  | "uk"
  | "london"
  | "italy"
  | "rome"
  | "spain"
  | "madrid"
  | "poland"
  | "warsaw"
  | "switzerland"
  | "zurich"
  | "russia"
  | "moscow"
  | "greece"
  | "portugal"
  | "sweden"
  | "denmark"
  | "norway"
  | "finland"
  | "austria"
  | "czechia"
  | "hungary"
  | "ukraine"
  | "eu"
  | "other";
 
export type EventStatus = "published" | "pending" | "draft";
 
// Phase 3: 自動翻訳対象言語（ja原文以外）。next-intlのロケール(ja/en/ko/zh/fr)のうち ja を除いたもの。
export type I18nLocale = "en" | "ko" | "zh" | "fr";
 
export const I18N_LOCALES: I18nLocale[] = ["en", "ko", "zh", "fr"];
 
export interface DanceEvent {
  id: string;
  title: string;
  type: EventType;
  genre: Genre;
  /** 開催ジャンル一覧(部門制の大会は複数)。未設定の旧データは genre(単一)へフォールバック(getEventGenres参照) */
  genres?: Genre[];
  region: Region;
  date: string;             // ISO yyyy-mm-dd
  deadline?: string;        // 申し込み締切
  venue: string;
  description: string;
  // Claude API による自動翻訳結果。キーが無い/空文字の言語は原文(description)にフォールバック表示する。
  descriptionI18n?: Partial<Record<I18nLocale, string>>;
  flyerUrl?: string;
  igHandle?: string;        // @なし
  igPostUrl?: string;
  entryUrl?: string;
  /** エントリー受付終了フラグ(adminの「締め切りました」ボタンで手動セット) */
  entryClosed?: boolean;
  status?: EventStatus;
  source?: string;          // どこから取得したか
  /** DB上の最終更新日時(ISO)。詳細ページの「情報最終確認日」表示に使う */
  updatedAt?: string;
}
 
export const EVENT_TYPES: EventType[] = [
  "battle",
  "contest",
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
  "freestyle",
  "all",
];
 
// 表示順: 北から南へ、個別化した都道府県→その地方の残りブロックの順に並べる。
export const REGIONS: Region[] = [
  "hokkaido",
  "miyagi",
  "tohoku",
  "tokyo",
  "kanagawa",
  "chiba",
  "saitama",
  "ibaraki",
  "kanto",
  "niigata",
  "hokuriku",
  "aichi",
  "tokai",
  "kyoto",
  "osaka",
  "kansai",
  "hiroshima",
  "chugoku",
  "shikoku",
  "fukuoka",
  "kyushu",
  "okinawa",
  "online",
  "seoul",
  "busan",
  "korea",
  "taipei",
  "taiwan",
  "shanghai",
  "beijing",
  "chengdu",
  "china",
  "hongkong",
  "vietnam",
  "thailand",
  "indonesia",
  "philippines",
  "malaysia",
  "singapore",
  "india",
  "asia",
  "australia",
  "newzealand",
  "newyork",
  "losangeles",
  "us",
  "canada",
  "mexico",
  "brazil",
  "southamerica",
  // ヨーロッパ: 「国→その首都」の並びが隣接するようにする
  "france",
  "paris",
  "germany",
  "berlin",
  "netherlands",
  "amsterdam",
  "belgium",
  "brussels",
  "uk",
  "london",
  "italy",
  "rome",
  "spain",
  "madrid",
  "poland",
  "warsaw",
  "switzerland",
  "zurich",
  "russia",
  "moscow",
  "greece",
  "portugal",
  "sweden",
  "denmark",
  "norway",
  "finland",
  "austria",
  "czechia",
  "hungary",
  "ukraine",
  "eu",
  "middleeast",
  "morocco",
  "africa",
  "other",
];
 
// フィルタのエリアチップを「国内/海外」タブで切り替えるための分類。
// "online" はどちらの地理区分にも属さないため、この2つには含めずFilterBar側で単独チップとして扱う。
export const DOMESTIC_REGIONS: Region[] = [
  "hokkaido",
  "miyagi",
  "tohoku",
  "tokyo",
  "kanagawa",
  "chiba",
  "saitama",
  "ibaraki",
  "kanto",
  "niigata",
  "hokuriku",
  "aichi",
  "tokai",
  "kyoto",
  "osaka",
  "kansai",
  "hiroshima",
  "chugoku",
  "shikoku",
  "fukuoka",
  "kyushu",
  "okinawa",
];
 
// 海外は国数が多く1枚のチップ羅列では見づらいため、表示は地域グループごとにまとめる。
// labelKey は messages の filters.<labelKey> の小見出しラベルに対応する。
export const OVERSEAS_AREA_GROUPS: {
  labelKey:
    | "areaAsia"
    | "areaOceania"
    | "areaAmericas"
    | "areaEurope"
    | "areaMiddleEastAfrica";
  regions: Region[];
}[] = [
  {
    labelKey: "areaAsia",
    regions: [
      "seoul", "busan", "korea", "taipei", "taiwan", "shanghai", "beijing",
      "chengdu", "china", "hongkong", "vietnam", "thailand", "indonesia",
      "philippines", "malaysia", "singapore", "india", "asia",
    ],
  },
  { labelKey: "areaOceania", regions: ["australia", "newzealand"] },
  {
    labelKey: "areaAmericas",
    regions: [
      "newyork", "losangeles", "us", "canada", "mexico", "brazil",
      "southamerica",
    ],
  },
  {
    labelKey: "areaEurope",
    regions: [
      "france", "paris", "germany", "berlin", "netherlands", "amsterdam",
      "belgium", "brussels", "uk", "london", "italy", "rome", "spain",
      "madrid", "poland", "warsaw", "switzerland", "zurich", "russia",
      "moscow", "greece", "portugal", "sweden", "denmark", "norway",
      "finland", "austria", "czechia", "hungary", "ukraine", "eu",
    ],
  },
  {
    labelKey: "areaMiddleEastAfrica",
    regions: ["middleeast", "morocco", "africa", "other"],
  },
];

export const OVERSEAS_REGIONS: Region[] = OVERSEAS_AREA_GROUPS.flatMap(
  (g) => g.regions,
);
 
// ヨーロッパの「国キー → [国キー, 首都キー]」対応。
// フィルタで国を選んだ時に、国キー本体に加えて対応する首都キーの行もヒットさせるために使う。
// 例: france を選択 → region が france または paris の行が対象。
// ここに載っていない region（首都キー自身や eu、日本国内など）はグループ化せず単独一致のみ。
export const REGION_GROUPS: Partial<Record<Region, Region[]>> = {
  france: ["france", "paris"],
  germany: ["germany", "berlin"],
  netherlands: ["netherlands", "amsterdam"],
  belgium: ["belgium", "brussels"],
  uk: ["uk", "london"],
  italy: ["italy", "rome"],
  spain: ["spain", "madrid"],
  poland: ["poland", "warsaw"],
  switzerland: ["switzerland", "zurich"],
  russia: ["russia", "moscow"],
};
 
/**
 * フィルタで選択された region（"any" も許容）に対して、実データの region がヒットするか判定する。
 * ヨーロッパの国キーが選ばれた場合は REGION_GROUPS を展開して国＋首都の両方にマッチさせる。
 * それ以外のキーは従来通りの完全一致。
 */
export function matchesRegionFilter(
  eventRegion: Region,
  filterRegion: Region | "any",
): boolean {
  if (filterRegion === "any") return true;
  const group = REGION_GROUPS[filterRegion];
  if (group) return group.includes(eventRegion);
  return eventRegion === filterRegion;
}
 
export const EVENT_STATUSES: EventStatus[] = ["pending", "published", "draft"];
 
/**
 * イベントの開催ジャンル一覧を返す。
 * genres(複数ジャンル)が設定されていればそれを、無い旧データは genre(単一)を1要素配列で返す。
 * "freestyle" は FREESTYLE 表記、"all" は ALL STYLE 明記の大会。どちらもフィルタでは厳密一致。
 */
export function getEventGenres(
  event: Pick<DanceEvent, "genre" | "genres">,
): Genre[] {
  return event.genres && event.genres.length > 0 ? event.genres : [event.genre];
}
 
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
    contest: t("contest"),
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
    freestyle: t("freestyle"),
    all: t("all"),
  };
}
 
export function buildRegionLabels(
  t: (key: Region) => string,
): Record<Region, string> {
  return {
    hokkaido: t("hokkaido"),
    miyagi: t("miyagi"),
    tohoku: t("tohoku"),
    tokyo: t("tokyo"),
    kanagawa: t("kanagawa"),
    chiba: t("chiba"),
    saitama: t("saitama"),
    ibaraki: t("ibaraki"),
    kanto: t("kanto"),
    niigata: t("niigata"),
    hokuriku: t("hokuriku"),
    aichi: t("aichi"),
    tokai: t("tokai"),
    kyoto: t("kyoto"),
    osaka: t("osaka"),
    kansai: t("kansai"),
    hiroshima: t("hiroshima"),
    chugoku: t("chugoku"),
    shikoku: t("shikoku"),
    fukuoka: t("fukuoka"),
    kyushu: t("kyushu"),
    okinawa: t("okinawa"),
    online: t("online"),
    seoul: t("seoul"),
    busan: t("busan"),
    korea: t("korea"),
    taipei: t("taipei"),
    taiwan: t("taiwan"),
    shanghai: t("shanghai"),
    beijing: t("beijing"),
    chengdu: t("chengdu"),
    china: t("china"),
    hongkong: t("hongkong"),
    vietnam: t("vietnam"),
    thailand: t("thailand"),
    indonesia: t("indonesia"),
    philippines: t("philippines"),
    malaysia: t("malaysia"),
    singapore: t("singapore"),
    india: t("india"),
    asia: t("asia"),
    australia: t("australia"),
    newzealand: t("newzealand"),
    newyork: t("newyork"),
    losangeles: t("losangeles"),
    us: t("us"),
    canada: t("canada"),
    mexico: t("mexico"),
    brazil: t("brazil"),
    southamerica: t("southamerica"),
    france: t("france"),
    paris: t("paris"),
    germany: t("germany"),
    berlin: t("berlin"),
    netherlands: t("netherlands"),
    amsterdam: t("amsterdam"),
    belgium: t("belgium"),
    brussels: t("brussels"),
    uk: t("uk"),
    london: t("london"),
    italy: t("italy"),
    rome: t("rome"),
    spain: t("spain"),
    madrid: t("madrid"),
    poland: t("poland"),
    warsaw: t("warsaw"),
    switzerland: t("switzerland"),
    zurich: t("zurich"),
    russia: t("russia"),
    moscow: t("moscow"),
    greece: t("greece"),
    portugal: t("portugal"),
    sweden: t("sweden"),
    denmark: t("denmark"),
    norway: t("norway"),
    finland: t("finland"),
    austria: t("austria"),
    czechia: t("czechia"),
    hungary: t("hungary"),
    ukraine: t("ukraine"),
    eu: t("eu"),
    middleeast: t("middleeast"),
    morocco: t("morocco"),
    africa: t("africa"),
    other: t("other"),
  };
}
 
