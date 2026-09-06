import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchOrganizerProfile, fetchOwnedEvent, fetchEventEntries } from "@/lib/organizer/data";
import { setEntryStatusAction } from "@/app/organizer/actions";
import CopyEmailsButton from "@/components/organizer/CopyEmailsButton";

interface Props {
  params: { id: string };
}

const ENTRY_STATUS_LABEL: Record<string, string> = {
  entered: "確定",
  waitlisted: "キャンセル待ち",
  cancelled: "キャンセル",
  checked_in: "受付済み",
};

export default async function OrganizerEntriesPage({ params }: Props) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/organizer/login");
  const profile = await fetchOrganizerProfile(user.id);
  if (!profile || profile.status !== "approved") redirect("/organizer");

  const event = await fetchOwnedEvent(user.id, params.id);
  if (!event) notFound();

  const entries = await fetchEventEntries(event.id);
  const active = entries.filter((e) => e.status === "entered" || e.status === "checked_in");
  const waitlisted = entries.filter((e) => e.status === "waitlisted");
  const cancelled = entries.filter((e) => e.status === "cancelled");
  const activeEmails = [...active, ...waitlisted].map((e) => e.email);

  return (
    <div>
      <Link href="/organizer" className="text-sm text-ink/50 hover:underline">
        ← マイイベント
      </Link>
      <h1 className="display mt-2 text-3xl font-black">{event.title}</h1>
      <p className="mt-1 text-sm text-ink/60">
        {event.date} / エントリーリスト
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-ink/10 bg-white/60 px-4 py-2 text-sm">
          確定 <span className="font-black">{active.length}</span>
          {event.entryCapacity ? ` / ${event.entryCapacity}` : ""}名
        </div>
        <div className="rounded-xl border border-ink/10 bg-white/60 px-4 py-2 text-sm">
          キャンセル待ち <span className="font-black">{waitlisted.length}</span>名
        </div>
        <div className="rounded-xl border border-ink/10 bg-white/60 px-4 py-2 text-sm text-ink/50">
          キャンセル {cancelled.length}名
        </div>
        <CopyEmailsButton emails={activeEmails} />
        <a href={`/organizer/events/${event.id}/entries/csv`} className="btn-ghost text-xs">
          CSVダウンロード
        </a>
      </div>

      {entries.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ink/20 p-10 text-center text-sm text-ink/50">
          まだエントリーがありません。イベントが公開されると、イベントページからエントリーできるようになります。
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink/50">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">名前</th>
                <th className="px-2 py-2">ダンサーネーム</th>
                <th className="px-2 py-2">クルー</th>
                <th className="px-2 py-2">部門</th>
                <th className="px-2 py-2">メール</th>
                <th className="px-2 py-2">状態</th>
                <th className="px-2 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr
                  key={e.id}
                  className={`border-b border-ink/5 ${e.status === "cancelled" ? "text-ink/35" : ""}`}
                >
                  <td className="px-2 py-2 text-ink/40">{i + 1}</td>
                  <td className="px-2 py-2 font-bold">{e.name}</td>
                  <td className="px-2 py-2">{e.dancerName ?? "-"}</td>
                  <td className="px-2 py-2">{e.crew ?? "-"}</td>
                  <td className="px-2 py-2">{e.category ?? "-"}</td>
                  <td className="px-2 py-2">{e.email}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        e.status === "entered"
                          ? "bg-green-600/10 text-green-700"
                          : e.status === "checked_in"
                            ? "bg-ink text-paper"
                            : e.status === "waitlisted"
                              ? "bg-cypher-yellow/30"
                              : "bg-ink/10"
                      }`}
                    >
                      {ENTRY_STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {e.status === "entered" && (
                        <>
                          <form action={setEntryStatusAction.bind(null, e.id, "checked_in")}>
                            <button className="btn-ghost px-2 py-1 text-[11px]">受付</button>
                          </form>
                          <form action={setEntryStatusAction.bind(null, e.id, "cancelled")}>
                            <button className="btn-ghost px-2 py-1 text-[11px] text-cypher-red">
                              キャンセル
                            </button>
                          </form>
                        </>
                      )}
                      {e.status === "checked_in" && (
                        <form action={setEntryStatusAction.bind(null, e.id, "entered")}>
                          <button className="btn-ghost px-2 py-1 text-[11px]">受付取消</button>
                        </form>
                      )}
                      {e.status === "waitlisted" && (
                        <>
                          <form action={setEntryStatusAction.bind(null, e.id, "entered")}>
                            <button className="btn-ghost px-2 py-1 text-[11px]">繰り上げ</button>
                          </form>
                          <form action={setEntryStatusAction.bind(null, e.id, "cancelled")}>
                            <button className="btn-ghost px-2 py-1 text-[11px] text-cypher-red">
                              キャンセル
                            </button>
                          </form>
                        </>
                      )}
                      {e.status === "cancelled" && (
                        <form action={setEntryStatusAction.bind(null, e.id, "entered")}>
                          <button className="btn-ghost px-2 py-1 text-[11px]">復活</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-ink/40">
        キャンセルすると、キャンセル待ちの先頭が自動で確定に繰り上がります。
        一斉連絡は「メール一覧をコピー」→ お使いのメールのBCCに貼り付けて送るのが確実です。
      </p>
    </div>
  );
}
