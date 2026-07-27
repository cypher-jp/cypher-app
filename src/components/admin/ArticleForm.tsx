"use client";

import {
  ARTICLE_TYPES,
  ARTICLE_STATUSES,
  ADMIN_ARTICLE_TYPE_LABEL,
  ADMIN_ARTICLE_STATUS_LABEL,
  type Article,
} from "@/types/article";

interface Props {
  action: (formData: FormData) => void;
  defaultValues?: Partial<Article>;
  submitLabel: string;
}

/**
 * 記事の作成・編集フォーム(管理画面)。
 * 本文はMarkdown(対応構文は src/lib/markdown.ts のコメント参照)。
 * AI下書き運用: チャットで生成した下書きを本文へ貼り付け → 事実確認・編集 → 公開。
 */
export default function ArticleForm({ action, defaultValues, submitLabel }: Props) {
  return (
    <form action={action} className="flex flex-col gap-6">
      <Field label="タイトル *">
        <input
          type="text"
          name="title"
          required
          defaultValue={defaultValues?.title}
          className="input"
          placeholder="例: バトル初出場の準備ガイド"
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="スラッグ(URL用・英小文字とハイフン) *">
          <input
            type="text"
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9\-]*"
            defaultValue={defaultValues?.slug}
            className="input"
            placeholder="first-battle-guide"
          />
        </Field>
        <Field label="記事タイプ">
          <select
            name="type"
            defaultValue={defaultValues?.type ?? "howto"}
            className="input"
          >
            {ARTICLE_TYPES.map((v) => (
              <option key={v} value={v}>
                {ADMIN_ARTICLE_TYPE_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ステータス">
          <select
            name="status"
            defaultValue={defaultValues?.status ?? "draft"}
            className="input"
          >
            {ARTICLE_STATUSES.map((v) => (
              <option key={v} value={v}>
                {ADMIN_ARTICLE_STATUS_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="本文(Markdown) *。見出しは ## と ###、箇条書きは「- 」、太字は **文字**、リンクは [文字](URL)">
        <textarea
          name="bodyMd"
          required
          rows={20}
          defaultValue={defaultValues?.bodyMd}
          className="input font-mono text-sm"
          placeholder={"## 見出し\n\n本文をここに書く。\n\n- 箇条書き1\n- 箇条書き2"}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="ヒーロー画像(任意。一覧カードと記事上部に表示)">
          <input type="file" name="heroImage" accept="image/*" className="input" />
          {defaultValues?.heroImageUrl && (
            <p className="mt-1 break-all text-xs text-ink/50">
              現在: {defaultValues.heroImageUrl}
            </p>
          )}
          <input
            type="hidden"
            name="existingHeroUrl"
            defaultValue={defaultValues?.heroImageUrl ?? ""}
          />
        </Field>
        <Field label="関連イベントID(任意・カンマ区切り)。イベント編集画面URLの /admin/events/【この部分】/edit をコピペ">
          <textarea
            name="relatedEventIds"
            rows={3}
            defaultValue={(defaultValues?.relatedEventIds ?? []).join(", ")}
            className="input font-mono text-xs"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx, ..."
          />
        </Field>
      </div>

      <div>
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
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold text-ink/70">{label}</span>
      {children}
    </label>
  );
}
