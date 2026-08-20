"use client";

import { useFormStatus } from "react-dom";

import { useState } from "react";
import {
  ENTRY_METHODS,
  EVENT_TYPES,
  GENRES,
  REGIONS,
  EVENT_STATUSES,
  type EntryMethod,
  type EventType,
  type Genre,
  type Region,
  type EventStatus,
} from "@/types/event";
import {
  ADMIN_EVENT_TYPE_LABEL,
  ADMIN_GENRE_LABEL,
  ADMIN_REGION_LABEL,
  ADMIN_STATUS_LABEL,
} from "@/lib/admin/labels";
import { extractIgHandle } from "@/lib/ig";
import { I18N_LOCALES, type I18nLocale } from "@/types/event";

const ADMIN_ENTRY_METHOD_LABEL: Record<EntryMethod, string> = {
  url: "URL(フォーム/サイト)",
  dm: "InstagramのDM",
  form: "Googleフォーム等",
  onsite: "当日受付",
  other: "その他",
};

const I18N_LOCALE_LABEL: Record<I18nLocale, string> = {
  en: "英語",
  ko: "韓国語",
  zh: "中国語",
  fr: "フランス語",
};

export interface EventFormValues {
  title: string;
  type: EventType;
  genre: Genre;
  genres: Genre[];
  region: Region;
  date: string;
  endDate: string;
  deadline: string;
  venue: string;
  description: string;
  igPostUrl: string;
  igHandle: string;
  entryUrl: string;
  status: EventStatus;
  source: string;
  flyerUrl: string;
  // 詳細情報(任意)
  timeInfo?: string;
  format?: string;
  entryFee?: string;
  audienceFee?: string;
  entrySlots?: string;
  entryMethod?: string;
  judges?: string;
  djs?: string;
  mc?: string;
  prize?: string;
  organizer?: string;
  // Phase 3: スクレイパー/翻訳バッチが自動生成した訳文。読み取り専用表示のみ(フォームからは編集不可)。
  descriptionI18n?: Partial<Record<I18nLocale, string>>;
}

interface Props {
  action: (formData: FormData) => void;
  defaultValues?: Partial<EventFormValues>;
  submitLabel: string;
}

// フライヤー画像をブラウザ側で縮小・JPEG圧縮する。
// Vercelのリクエスト上限(4.5MB)を超える大きな画像(IG保存画像は3〜7MB)を送ると
// 保存自体が失敗して「差し替えたのに反映されない」状態になるため、送信前に必ず小さくする。
const FLYER_MAX_EDGE = 1600;
const FLYER_JPEG_QUALITY = 0.85;
const FLYER_COMPRESS_THRESHOLD = 900 * 1024; // これ以下ならそのまま送る

async function compressFlyer(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= FLYER_COMPRESS_THRESHOLD && !/png|webp|heic/i.test(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, FLYER_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", FLYER_JPEG_QUALITY),
  );
  if (!blob) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "flyer";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

export default function EventForm({ action, defaultValues, submitLabel }: Props) {
  const [igPostUrl, setIgPostUrl] = useState(defaultValues?.igPostUrl ?? "");
  const [flyerNote, setFlyerNote] = useState<string | null>(null);

  async function handleFlyerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) {
      setFlyerNote(null);
      return;
    }
    setFlyerNote("画像を圧縮中…");
    try {
      const compressed = await compressFlyer(file);
      if (compressed !== file) {
        const dt = new DataTransfer();
        dt.items.add(compressed);
        input.files = dt.files;
      }
      setFlyerNote(
        `${Math.round(compressed.size / 1024)}KB で送信します(元: ${Math.round(file.size / 1024)}KB)`,
      );
    } catch {
      setFlyerNote("圧縮に失敗したため元画像のまま送信します");
    }
  }
  const [igHandle, setIgHandle] = useState(defaultValues?.igHandle ?? "");
  const [igHandleTouched, setIgHandleTouched] = useState(
    Boolean(defaultValues?.igHandle),
  );

  function handleIgPostUrlChange(value: string) {
    setIgPostUrl(value);
    if (!igHandleTouched) {
      const extracted = extractIgHandle(value);
      if (extracted) setIgHandle(extracted);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {defaultValues?.flyerUrl && (
        <input
          type="hidden"
          name="existingFlyerUrl"
          value={defaultValues.flyerUrl}
        />
      )}

      <Field label="タイトル *">
        <input
          type="text"
          name="title"
          required
          defaultValue={defaultValues?.title}
          className="input"
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="種別 *">
          <select
            name="type"
            required
            defaultValue={defaultValues?.type ?? "battle"}
            className="input"
          >
            {EVENT_TYPES.map((v) => (
              <option key={v} value={v}>
                {ADMIN_EVENT_TYPE_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ジャンル(複数選択可。FREESTYLE表記→「Freestyle」、ALL STYLE明記→「ALL STYLE」)">
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
            {GENRES.map((v) => (
              <label key={v} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="genres"
                  value={v}
                  defaultChecked={(defaultValues?.genres &&
                  defaultValues.genres.length > 0
                    ? defaultValues.genres
                    : [defaultValues?.genre ?? "all"]
                  ).includes(v)}
                />
                {ADMIN_GENRE_LABEL[v]}
              </label>
            ))}
          </div>
        </Field>
        <Field label="エリア *">
          <select
            name="region"
            required
            defaultValue={defaultValues?.region ?? "other"}
            className="input"
          >
            {REGIONS.map((v) => (
              <option key={v} value={v}>
                {ADMIN_REGION_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="開催日 *">
          <input
            type="date"
            name="date"
            required
            defaultValue={defaultValues?.date}
            className="input"
          />
        </Field>
        <Field label="終了日(複数日開催のみ)">
          <input
            type="date"
            name="endDate"
            defaultValue={defaultValues?.endDate}
            className="input"
          />
        </Field>
        <Field label="エントリー締切">
          <input
            type="date"
            name="deadline"
            defaultValue={defaultValues?.deadline}
            className="input"
          />
        </Field>
      </div>

      <Field label="会場">
        <input
          type="text"
          name="venue"
          defaultValue={defaultValues?.venue}
          className="input"
        />
      </Field>

      <Field label="説明">
        <textarea
          name="description"
          rows={5}
          defaultValue={defaultValues?.description}
          className="input"
        />
      </Field>

      {defaultValues?.descriptionI18n &&
        Object.keys(defaultValues.descriptionI18n).length > 0 && (
          <div className="rounded-xl border border-ink/10 bg-ink/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-ink/50">
              自動翻訳(読み取り専用・編集不可)
            </p>
            <p className="mt-1 text-xs text-ink/40">
              説明を変更しても訳文は自動更新されません。翻訳をやり直すには
              scripts/translate-existing.ts を再実行してください。
            </p>
            <dl className="mt-3 flex flex-col gap-3">
              {I18N_LOCALES.map((locale) => {
                const text = defaultValues.descriptionI18n?.[locale];
                if (!text) return null;
                return (
                  <div key={locale}>
                    <dt className="text-xs font-bold text-ink/60">
                      {I18N_LOCALE_LABEL[locale]}
                    </dt>
                    <dd className="mt-1 whitespace-pre-line text-sm text-ink/70">
                      {text}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Instagram投稿URL">
          <input
            type="url"
            name="igPostUrl"
            value={igPostUrl}
            onChange={(e) => handleIgPostUrlChange(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            className="input"
          />
        </Field>
        <Field label="Instagramアカウント(@なし)">
          <input
            type="text"
            name="igHandle"
            value={igHandle}
            onChange={(e) => {
              setIgHandle(e.target.value);
              setIgHandleTouched(true);
            }}
            placeholder="world_cypher"
            className="input"
          />
        </Field>
      </div>

      <Field label="エントリーURL(公式サイト等)">
        <input
          type="url"
          name="entryUrl"
          defaultValue={defaultValues?.entryUrl}
          placeholder="https://..."
          className="input"
        />
      </Field>

      {/* 詳細情報: 空欄はサイト上で非表示になる。全て任意 */}
      <div className="rounded-xl border border-ink/10 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-ink/50">
          詳細情報(任意・空欄は非表示)
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <Field label="時間(OPEN/START)">
            <input type="text" name="timeInfo" defaultValue={defaultValues?.timeInfo} placeholder="OPEN 12:00 / START 13:00" className="input" />
          </Field>
          <Field label="形式">
            <input type="text" name="format" defaultValue={defaultValues?.format} placeholder="1on1 / 2on2 / crew" className="input" />
          </Field>
          <Field label="エントリー枠数">
            <input type="text" name="entrySlots" defaultValue={defaultValues?.entrySlots} placeholder="32" className="input" />
          </Field>
          <Field label="エントリー費">
            <input type="text" name="entryFee" defaultValue={defaultValues?.entryFee} placeholder="¥2,000" className="input" />
          </Field>
          <Field label="観覧料">
            <input type="text" name="audienceFee" defaultValue={defaultValues?.audienceFee} placeholder="¥1,000 / 無料" className="input" />
          </Field>
          <Field label="エントリー方法">
            <select name="entryMethod" defaultValue={defaultValues?.entryMethod ?? ""} className="input">
              <option value="">未設定</option>
              {ENTRY_METHODS.map((v) => (
                <option key={v} value={v}>
                  {ADMIN_ENTRY_METHOD_LABEL[v]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ジャッジ(カンマ区切り)">
            <input type="text" name="judges" defaultValue={defaultValues?.judges} className="input" />
          </Field>
          <Field label="DJ(カンマ区切り)">
            <input type="text" name="djs" defaultValue={defaultValues?.djs} className="input" />
          </Field>
          <Field label="MC">
            <input type="text" name="mc" defaultValue={defaultValues?.mc} className="input" />
          </Field>
          <Field label="賞金・賞品">
            <input type="text" name="prize" defaultValue={defaultValues?.prize} placeholder="優勝 ¥100,000" className="input" />
          </Field>
          <Field label="主催">
            <input type="text" name="organizer" defaultValue={defaultValues?.organizer} className="input" />
          </Field>
        </div>
      </div>

      <Field label="フライヤー画像">
        <input
          type="file"
          name="flyer"
          accept="image/*"
          onChange={handleFlyerChange}
          className="input file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-paper"
        />
        {flyerNote && <p className="mt-1 text-xs text-ink/50">{flyerNote}</p>}
        {defaultValues?.flyerUrl && (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={defaultValues.flyerUrl}
              alt=""
              className="h-16 w-24 rounded-lg object-cover"
            />
            <span className="text-xs text-ink/50">
              現在の画像。新しいファイルを選ぶと置き換わります。
            </span>
          </div>
        )}
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="ステータス">
          <select
            name="status"
            defaultValue={defaultValues?.status ?? "pending"}
            className="input"
          >
            {EVENT_STATUSES.map((v) => (
              <option key={v} value={v}>
                {ADMIN_STATUS_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="出典(source)">
          <input
            type="text"
            name="source"
            defaultValue={defaultValues?.source ?? "manual"}
            className="input"
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3">
        <SaveButton label={submitLabel} />
      </div>
    </form>
  );
}

/** 送信中は「保存中...」表示＋二重押し防止。画像圧縮やアップロードで数秒かかるため必須。 */
function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      {pending && <span className="text-sm text-ink/60">保存中... 画面が切り替わるまでお待ちください</span>}
      <button type="submit" disabled={pending} aria-busy={pending} className="btn-primary disabled:cursor-wait disabled:opacity-50">
        {pending ? "保存中..." : label}
      </button>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
        {label}
      </label>
      {children}
    </div>
  );
}
