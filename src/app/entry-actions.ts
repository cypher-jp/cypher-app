"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createEntry, cancelEntryByToken } from "@/lib/entries";
import { routing } from "@/i18n/routing";

export interface EntryFormState {
  status: "idle" | "entered" | "waitlisted" | "error";
  /** messages/*.json の entry.* キー名 */
  errorKey?: "errorClosed" | "errorDuplicate" | "errorInvalid" | "errorGeneric";
  cancelToken?: string;
}

/** 公開イベントページのエントリーフォーム送信(useFormState用) */
export async function submitEntryAction(
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const eventId = String(formData.get("eventId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) {
    return { status: "error", errorKey: "errorGeneric" };
  }
  // ボット対策のハニーポット(人間には見えない欄。埋まっていたら黙って成功扱い)
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "entered" };
  }

  const result = await createEntry({
    eventId,
    name: String(formData.get("name") ?? ""),
    dancerName: String(formData.get("dancerName") ?? ""),
    crew: String(formData.get("crew") ?? ""),
    category: String(formData.get("category") ?? ""),
    email: String(formData.get("email") ?? ""),
  });

  if (!result.ok) {
    const errorKey =
      result.reason === "duplicate"
        ? "errorDuplicate"
        : result.reason === "closed"
          ? "errorClosed"
          : result.reason === "invalid"
            ? "errorInvalid"
            : "errorGeneric";
    return { status: "error", errorKey };
  }

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/events/${eventId}`);
  }
  return { status: result.status, cancelToken: result.cancelToken };
}

/** キャンセルリンクからの取り消し実行(実行後は同じページに ?done=1 で戻す) */
export async function cancelEntrySubmitAction(
  locale: string,
  token: string,
  _formData: FormData,
): Promise<void> {
  const result = await cancelEntryByToken(token);
  if (result.ok && !result.alreadyCancelled) {
    for (const l of routing.locales) {
      revalidatePath(`/${l}/events/${result.eventId}`);
    }
  }
  const safeLocale = (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
  redirect(`/${safeLocale}/entry/cancel/${token}?done=${result.ok ? "1" : "0"}`);
}
