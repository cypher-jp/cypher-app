import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchOrganizerProfile, fetchOrganizerEvents } from "@/lib/organizer/data";
import { isAdminEmail } from "@/lib/adminAuth";

interface Props {
  searchParams: { message?: string; error?: string };
}

const STATUS_LABEL: Record<string, string> = {
  pending: "承認待ち",
  published: "公開中",
  draft: "非公開",
};

export default async function OrganizerDashboardPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/organizer/login");

  const profile = await fetchOrganizerProfile(user.id);
  if (!profile) {
    if (isAdminEmail(user.email)) {
      return (
        <div className="mx-auto max-w-md text-center">
          <p className="text-sm text-ink/60">
            管理者アカウントでログイン中です。
          </p>
          <Link href="/admin" className="btn-primary mt-4 inline-block">
            管理画面へ
          </Link>
        </div>
      );
    }
    redirect("/organizer/apply");
  }

  if (profile.status === "pending") {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="display text-3xl font-black">審査中です</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink/60">
          「{profile.name}」の主催者登録を運営が確認しています。
          承認されるとこのページからイベント掲載とエントリー管理ができるようになります。
          通常1〜2日以内にご案内します。
        </p>
      </div>
    );
  }

  if (profile.status === "rejected") {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="display text-3xl font-black">承認されませんでした</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink/60">
          今回の申請は承認されませんでした。心当たりがない場合は、サイトのお問い合わせからご連絡ください。
        </p>
      </div>
    );
  }

  const events = await fetchOrganizerEvents(user.id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-3xl font-black">{profile.name}</h1>
          <p className="mt-1 text-sm text-ink/60">マイイベント({events.length}件)</p>
        </div>
        <Link href="/organizer/events/new" className="btn-primary">
          ＋ イベントを登録
        </Link>
      </div>

      {searchParams.message && (
        <div className="mt-4 rounded-xl border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700">
          ✓ {searchParams.message}
        </div>
      )}
      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {searchParams.error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ink/20 p-10 text-center text-sm text-ink/50">
          まだイベントがありません。「イベントを登録」から最初のイベントを作りましょう。
          登録内容は運営の承認後にサイトへ公開されます。
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/60 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      ev.status === "published"
                        ? "bg-green-600/10 text-green-700"
                        : ev.status === "pending"
                          ? "bg-cypher-yellow/30 text-ink"
                          : "bg-ink/10 text-ink/60"
                    }`}
                  >
                    {STATUS_LABEL[ev.status ?? "pending"]}
                  </span>
                  <span className="text-xs text-ink/50">{ev.date}</span>
                </div>
                <p className="mt-1 truncate font-bold">{ev.title}</p>
                {ev.acceptEntries && (
                  <p className="mt-0.5 text-xs text-ink/60">
                    エントリー {ev.entryCount}
                    {ev.entryCapacity ? ` / ${ev.entryCapacity}` : ""}名
                    {ev.waitlistCount > 0 ? `(キャンセル待ち ${ev.waitlistCount})` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {ev.acceptEntries && (
                  <Link
                    href={`/organizer/events/${ev.id}/entries`}
                    className="btn-primary text-xs"
                  >
                    エントリーリスト
                  </Link>
                )}
                <Link href={`/organizer/events/${ev.id}/edit`} className="btn-ghost text-xs">
                  編集
                </Link>
                {ev.status === "published" && (
                  <a
                    href={`/ja/events/${ev.id}`}
                    target="_blank"
                    rel="noopener"
                    className="btn-ghost text-xs"
                  >
                    公開ページ
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
