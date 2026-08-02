"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTACT_CATEGORIES, type ContactCategory } from "@/lib/contact";

/**
 * お問い合わせ送信。RLSの anon insert ポリシー(010_contacts.sql)により
 * 未ログインでも contacts テーブルへの挿入だけができる。
 */
export async function submitContactAction(
  locale: string,
  formData: FormData,
): Promise<void> {
  // ハニーポット: 人間には見えない入力欄。埋まっていたらbotとみなし、
  // 成功したふりをして保存しない(スパム対策)。
  const honeypot = String(formData.get("website") ?? "");
  if (honeypot) {
    redirect(`/${locale}/contact?sent=1`);
  }

  const categoryRaw = String(formData.get("category") ?? "other");
  const category: ContactCategory = (
    CONTACT_CATEGORIES as readonly string[]
  ).includes(categoryRaw)
    ? (categoryRaw as ContactCategory)
    : "other";
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().slice(0, 320);
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);

  if (!email || !message) {
    redirect(`/${locale}/contact?error=1`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("contacts")
    .insert({ category, name, email, message });

  if (error) {
    console.warn("[contact] insert failed:", error.message);
    redirect(`/${locale}/contact?error=1`);
  }

  redirect(`/${locale}/contact?sent=1`);
}
