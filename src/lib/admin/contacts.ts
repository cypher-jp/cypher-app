import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTACT_CATEGORIES, type ContactRow, type ContactCategory } from "@/lib/contact";

interface DbRow {
  id: string;
  category: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  created_at: string;
}

function toContactCategory(value: string): ContactCategory {
  return (CONTACT_CATEGORIES as readonly string[]).includes(value)
    ? (value as ContactCategory)
    : "other";
}

/** 管理画面用: お問い合わせ一覧(新しい順)。テーブル未作成でも落ちないよう[]でフォールバック */
export async function fetchContacts(): Promise<ContactRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id,category,name,email,message,read,created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.warn("[admin] fetchContacts failed:", error.message);
    return [];
  }
  return (data as DbRow[]).map((row) => ({
    id: row.id,
    category: toContactCategory(row.category),
    name: row.name,
    email: row.email,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  }));
}
