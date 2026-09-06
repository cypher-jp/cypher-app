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
  submit: string;
  submitting: string;
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

export default function EntryForm({ eventId, categories, cancelBasePath, labels }: Props) {
  const [state, formAction] = useFormState(submitEntryAction, initialState);

  if (state.status === "entered" || state.status === "waitlisted") {
    const cancelUrl = state.cancelToken ? `${cancelBasePath}/${state.cancelToken}` : null;
    return (
      <div className="rounded-2xl border border-green-600/30 bg-green-600/10 p-5 text-sm">
        <p className="font-bold text-green-700">
          ✓ {state.status === "entered" ? labels.successEntered : labels.successWaitlisted}
        </p>
        {cancelUrl && (
          <p className="mt-3 break-all text-xs leading-relaxed text-ink/60">
            {labels.cancelLinkNote}
            <br />
            <a href={cancelUrl} className="underline">
              {typeof window !== "undefined" ? `${window.location.origin}${cancelUrl}` : cancelUrl}
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
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
        <div className="rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {labels[state.errorKey ?? "errorGeneric"]}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-ink/50">
          {labels.name} *
          <input type="text" name="name" required maxLength={100} className="input font-normal normal-case" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-ink/50">
          {labels.dancerName}
          <input type="text" name="dancerName" maxLength={100} className="input font-normal normal-case" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-ink/50">
          {labels.crew}
          <input type="text" name="crew" maxLength={100} className="input font-normal normal-case" />
        </label>
        {categories.length > 0 && (
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-ink/50">
            {labels.category} *
            <select name="category" required className="input font-normal normal-case">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-ink/50">
          {labels.email} *
          <input type="email" name="email" required maxLength={200} className="input font-normal normal-case" />
        </label>
      </div>

      <SubmitButton label={labels.submit} pendingLabel={labels.submitting} />
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
      className="btn-primary disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
