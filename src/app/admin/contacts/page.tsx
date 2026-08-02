import Link from "next/link";
import SubmitButton from "@/components/admin/SubmitButton";
import { markContactReadAction } from "@/app/admin/actions";
import { fetchContacts } from "@/lib/admin/contacts";
import type { ContactCategory } from "@/lib/contact";

const CATEGORY_LABEL: Record<ContactCategory, string> = {
  listing: "イベント掲載のご依頼",
  correction: "掲載情報の訂正",
  other: "その他",
};

export const dynamic = "force-dynamic";

/** お問い合わせ一覧(管理画面)。新しい順。既読/未読を切り替えられる */
export default async function AdminContactsPage() {
  const contacts = await fetchContacts();
  const unread = contacts.filter((c) => !c.read).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-3xl font-black">CONTACTS</h1>
        <Link href="/admin" className="btn-ghost text-sm">
          ← イベント管理へ
        </Link>
      </div>
      <p className="mt-2 text-sm text-ink/60">
        全{contacts.length}件 / 未読{unread}件
      </p>

      {contacts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ink/20 p-12 text-center text-ink/60">
          お問い合わせはまだありません。
          <p className="mt-2 text-xs">
            一覧が出ない場合は supabase/migrations/010_contacts.sql をSQL
            Editorで実行してください。
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {contacts.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl border p-5 shadow-card ${
                c.read
                  ? "border-ink/10 bg-paper opacity-70"
                  : "border-cypher-red/30 bg-paper"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {!c.read && (
                  <span className="chip bg-cypher-red text-paper">未読</span>
                )}
                <span className="chip-outline">{CATEGORY_LABEL[c.category]}</span>
                <span className="text-xs text-ink/50">
                  {c.createdAt.slice(0, 16).replace("T", " ")}
                </span>
              </div>
              <div className="mt-2 text-sm font-bold">
                {c.name || "(名前なし)"}
                <a
                  href={`mailto:${c.email}`}
                  className="ml-2 font-normal text-cypher-navy underline"
                >
                  {c.email}
                </a>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-ink/80">
                {c.message}
              </p>
              <div className="mt-3">
                <form action={markContactReadAction.bind(null, c.id, !c.read)}>
                  <SubmitButton
                    label={c.read ? "未読に戻す" : "既読にする"}
                    pendingLabel="更新中..."
                    variant="ghost"
                  />
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
