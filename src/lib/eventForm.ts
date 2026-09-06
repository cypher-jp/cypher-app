import { extractIgHandle } from "@/lib/ig";
import { GENRES, type EventStatus, type Genre } from "@/types/event";

/**
 * イベント登録/編集フォーム(EventForm)のFormData解析。
 * 管理画面(admin)と主催者ポータル(organizer)の両方から使う共通ロジック。
 * ("use server"ファイルからは非asyncをexportできないため独立モジュールに置く)
 */
export interface ParsedForm {
  title: string;
  type: string;
  genre: string;
  genres: Genre[];
  region: string;
  date: string;
  endDate: string | null;
  deadline: string | null;
  venue: string;
  description: string;
  igPostUrl: string | null;
  igHandle: string | null;
  entryUrl: string | null;
  status: EventStatus;
  source: string | null;
  flyerFile: File | null;
  /** 追加画像(複数)。ギャラリーとしてイベント詳細ページに表示する */
  galleryFiles: File[];
  timeInfo: string | null;
  format: string | null;
  entryFee: string | null;
  audienceFee: string | null;
  entrySlots: string | null;
  entryMethod: string | null;
  judges: string | null;
  djs: string | null;
  mc: string | null;
  prize: string | null;
  organizer: string | null;
  // サイト内エントリー受付の設定
  acceptEntries: boolean;
  entryCapacity: number | null;
  entryCategories: string[];
}

// 任意テキスト項目: 空欄は null で保存する
function optField(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

export function parseEventForm(formData: FormData): ParsedForm {
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "battle");
  // ジャンル(複数選択チェックボックス)。1つも選ばれていなければ["all"]。
  // 先頭を従来のgenre(単一・代表ジャンル)として保存し互換を保つ。
  const genresRaw = formData.getAll("genres").map((v) => String(v));
  const genres = genresRaw.filter((g): g is Genre =>
    (GENRES as string[]).includes(g),
  );
  const normalizedGenres: Genre[] = genres.length > 0 ? genres : ["all"];
  const genre = normalizedGenres[0];
  const region = String(formData.get("region") ?? "other");
  const date = String(formData.get("date") ?? "").trim();
  // 終了日: 開催日より後の日付のみ有効。同日・過去日は単日イベント扱い(null)にする。
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const endDate = endDateRaw && endDateRaw > date ? endDateRaw : null;
  const deadlineRaw = String(formData.get("deadline") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const igPostUrlRaw = String(formData.get("igPostUrl") ?? "").trim();
  const igHandleRaw = String(formData.get("igHandle") ?? "").trim();
  const entryUrlRaw = String(formData.get("entryUrl") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "pending");
  const status: EventStatus =
    statusRaw === "published" || statusRaw === "draft" ? statusRaw : "pending";
  const sourceRaw = String(formData.get("source") ?? "").trim();

  const igHandle = igHandleRaw || extractIgHandle(igPostUrlRaw) || null;

  const flyerEntry = formData.get("flyer");
  const flyerFile =
    flyerEntry instanceof File && flyerEntry.size > 0 ? flyerEntry : null;

  const galleryFiles = formData
    .getAll("gallery")
    .filter((v): v is File => v instanceof File && v.size > 0);

  // サイト内エントリー受付
  const acceptEntries = formData.get("acceptEntries") === "on";
  const capacityRaw = Number(String(formData.get("entryCapacity") ?? "").trim());
  const entryCapacity =
    Number.isInteger(capacityRaw) && capacityRaw > 0 ? capacityRaw : null;
  const entryCategories = String(formData.get("entryCategories") ?? "")
    .split(/[,、\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  return {
    title,
    type,
    genre,
    genres: normalizedGenres,
    region,
    date,
    endDate,
    deadline: deadlineRaw || null,
    venue,
    description,
    igPostUrl: igPostUrlRaw || null,
    igHandle,
    entryUrl: entryUrlRaw || null,
    status,
    source: sourceRaw || null,
    flyerFile,
    galleryFiles,
    timeInfo: optField(formData, "timeInfo"),
    format: optField(formData, "format"),
    entryFee: optField(formData, "entryFee"),
    audienceFee: optField(formData, "audienceFee"),
    entrySlots: optField(formData, "entrySlots"),
    entryMethod: optField(formData, "entryMethod"),
    judges: optField(formData, "judges"),
    djs: optField(formData, "djs"),
    mc: optField(formData, "mc"),
    prize: optField(formData, "prize"),
    organizer: optField(formData, "organizer"),
    acceptEntries,
    entryCapacity,
    entryCategories,
  };
}

export function detailFields(parsed: ParsedForm) {
  return {
    timeInfo: parsed.timeInfo,
    format: parsed.format,
    entryFee: parsed.entryFee,
    audienceFee: parsed.audienceFee,
    entrySlots: parsed.entrySlots,
    entryMethod: parsed.entryMethod,
    judges: parsed.judges,
    djs: parsed.djs,
    mc: parsed.mc,
    prize: parsed.prize,
    organizer: parsed.organizer,
  };
}

export function entrySettingsFields(parsed: ParsedForm) {
  return {
    acceptEntries: parsed.acceptEntries,
    entryCapacity: parsed.entryCapacity,
    entryCategories: parsed.entryCategories,
  };
}
