"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitEntryAction, type EntryFormState } from "@/app/entry-actions";

/** 表示文言は親(サーバー側)で翻訳して渡す */
export interface EntryFormLabels {
  name: string;
  dancerName: string;
  crew: string;
  category: string;
  email: string;
  emailNote: string;
  submit: string;
  submitting: string;
  noAccountNote: string;
  successEntered: string;
  successWaitlisted: string;
  cancelLinkNote: string;
  cancelLinkLabel: string;
  errorClosed: string;
  errorDuplicate: string;
  errorInvalid: string;
  errorGeneric: string;
}

interface Props {
  eventId: string;
  categories: string[];
  /** キャンセルページのURLプレフィックス(/{locale}/entry/cancel) */
  cancelBasePath: string;
  labels: EntryFormLabels;
}

const initialState: EntryFormState = { status: "idle" };

const FIELD_LABEL =
  "text-[11px] font-extrabold uppercase tracking-[0.15em] text-ink/50";
const FIELD_INPUT =
  "w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-ink";

export default function EntryForm({ eventId, categories, cancelBasePath, labels }: Props) {
  const [state, formAction] = useFormState(submitEntryAction, initialState);

  if (state.status === "entered" || state.status === "waitlisted") {
    const cancelUrl = state.cancelToken ? `${cancelBasePath}/${state.cancelToken}` : null;
    return (
      <div className="rounded-2xl border-2 border-cypher-green bg-paper p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cypher-green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="display text-lg font-black text-ink">
            {state.status === "entered" ? labels.successEntered : labels.successWaitlisted}
          </span>
        </div>
        {cancelUrl && (
          <div className="mt-4 rounded-xl bg-ink/5 px-4 py-3">
            <p className="text-[11px] font-bold tracking-wide text-ink/50">
              {labels.cancelLinkNote}
            </p>
            <a href={cancelUrl} className="mt-1 block break-all text-xs text-cypher-red underline">
              {typeof window !== "undefined"
                ? `${window.location.origin}${cancelUrl}`
                : labels.cancelLinkLabel}
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl bg-paper p-4 sm:p-5">
      <input type="hidden" name="eventId" value={eventId} />
      {/* honeypot: 人間には見えない欄。ボットが埋めると弾かれる */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {state.status === "error" && (
        <div className="mb-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {labels[state.errorKey ?? "errorGeneric"]}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>
              {labels.dancerName}
            </span>
            <input type="text" name="dancerName" maxLength={100} className={FIELD_INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>
              {labels.name} <span className="text-cypher-red">*</span>
            </span>
            <input type="text" name="name" required maxLength={100} className={FIELD_INPUT} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>{labels.crew}</span>
          <input type="text" name="crew" maxLength={100} className={FIELD_INPUT} />
        </label>

        {categories.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>
              {labels.category} <span className="text-cypher-red">*</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value={c}
                    required
                    className="peer sr-only"
                  />
                  <span className="block rounded-xl border border-ink/15 bg-white px-2 py-3 text-center text-[13px] font-bold text-ink/60 transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
                    {c}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>
            {labels.email} <span className="text-cypher-red">*</span>
          </span>
          <input type="email" name="email" required maxLength={200} className={FIELD_INPUT} />
          <span className="text-[11px] text-ink/45">{labels.emailNote}</span>
        </label>

        <SubmitButton label={labels.submit} pendingLabel={labels.submitting} />
        <p className="text-center text-[11px] text-ink/45">{labels.noAccountNote}</p>
      </div>
    </form>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-1 rounded-full bg-cypher-red py-4 text-base font-extrabold tracking-wide text-white shadow-card transition hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
