"use client";

import { useState } from "react";
import {
  EVENT_TYPES,
  GENRES,
  REGIONS,
  EVENT_STATUSES,
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
  region: Region;
  date: string;
  deadline: string;
  venue: string;
  description: string;
  igPostUrl: string;
  igHandle: string;
  entryUrl: string;
  status: EventStatus;
  source: string;
  flyerUrl: string;
  // Phase 3: スクレイパー/翻訳バッチが自動生成した訳文。読み取り専用表示のみ(フォームからは編集不可)。
  descriptionI18n?: Partial<Record<I18nLocale, string>>;
}

interface Props {
  action: (formData: FormData) => void;
  defaultValues?: Partial<EventFormValues>;
  submitLabel: string;
}

export default function EventForm({ action, defaultValues, submitLabel }: Props) {
  const [igPostUrl, setIgPostUrl] = useState(defaultValues?.igPostUrl ?? "");
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
        <Field label="ジャンル">
          <select
            name="genre"
            defaultValue={defaultValues?.genre ?? "all"}
            className="input"
          >
            {GENRES.map((v) => (
              <option key={v} value={v}>
                {ADMIN_GENRE_LABEL[v]}
              </option>
            ))}
          </select>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="開催日 *">
          <input
            type="date"
            name="date"
            required
            defaultValue={defaultValues?.date}
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

      <Field label="フライヤー画像">
        <input
          type="file"
          name="flyer"
          accept="image/*"
          className="input file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-paper"
        />
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

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
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
