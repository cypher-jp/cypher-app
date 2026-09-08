import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchOrganizerProfile, fetchOrganizerEvents } from "@/lib/organizer/data";
import { isAdminEmail } from "@/lib/adminAuth";

interface Props {
  searchParams: { message?: string; error?: string };
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function dateParts(dateStr: string): { month: string; day: string; weekday: string } {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return { month: "", day: dateStr, weekday: "" };
  return {
    month: MONTHS[d.getUTCMonth()] ?? "",
    day: String(d.getUTCDate()),
    weekday: WEEKDAYS[new Date(`${dateStr}T12:00:00+09:00`).getDay()] ?? "",
  };
}

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
          <p className="text-sm text-ink/60">管理者アカウントでログイン中です。</p>
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
  const publishedCount = events.filter((e) => e.status === "published").length;
  const pendingCount = events.filter((e) => e.status === "pending").length;
  const totalEntries = events.reduce((sum, e) => sum + e.entryCount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold tracking-[0.25em] text-cypher-red">
            MY EVENTS
          </span>
          <h1 className="display text-3xl font-black tracking-tight">
            {profile.name} のイベント
          </h1>
        </div>
        <Link
          href="/organizer/events/new"
          className="rounded-full bg-cypher-red px-6 py-3.5 text-sm font-extrabold text-white shadow-card transition hover:opacity-90"
        >
          ＋ イベントを登録
        </Link>
      </div>

      <div className="mt-5 flex gap-6 text-sm text-ink/55">
        <span>
          <span className="display mr-1 text-base font-black text-ink">{publishedCount}</span>
          公開中
        </span>
        <span>
          <span className="display mr-1 text-base font-black text-ink">{pendingCount}</span>
          承認待ち
        </span>
        <span>
          <span className="display mr-1 text-base font-black text-cypher-red">{totalEntries}</span>
          総エントリー
        </span>
      </div>

      {searchParams.message && (
        <div className="mt-5 rounded-xl border border-cypher-green/30 bg-cypher-green/10 px-4 py-3 text-sm text-cypher-green">
          ✓ {searchParams.message}
        </div>
      )}
      {searchParams.error && (
        <div className="mt-5 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {searchParams.error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-ink/20 p-10 text-center text-sm text-ink/50">
          まだイベントがありません。「イベントを登録」から最初のイベントを作りましょう。
          登録内容は運営の承認後にサイトへ公開されます。
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {events.map((ev) => {
            const { month, day, weekday } = dateParts(ev.date);
            const isPending = ev.status === "pending";
            const isPublished = ev.status === "published";
            return (
              <div
                key={ev.id}
                className={`flex overflow-hidden rounded-3xl bg-white shadow-card ${
                  isPending ? "border border-dashed border-ink/25" : "border border-ink/10"
                }`}
              >
                {/* 日付ブロック */}
                <div
                  className={`flex w-24 shrink-0 flex-col items-center justify-center gap-0.5 sm:w-36 ${
                    isPublished
                      ? ev.acceptEntries
                        ? "bg-ink text-paper"
                        : "bg-cypher-navy text-paper"
                      : "bg-ink/5 text-ink/50"
                  }`}
                >
                  <span
                    className={`text-[11px] font-extrabold tracking-[0.25em] ${
                      isPublished ? (ev.acceptEntries ? "text-cypher-red" : "text-cypher-yellow") : ""
                    }`}
                  >
                    {month}
                  </span>
                  <span className="display text-4xl font-black leading-none">{day}</span>
                  <span className={`text-[11px] ${isPublished ? "text-paper/55" : ""}`}>
                    {weekday}
                  </span>
                </div>

                {/* 本体 */}
                <div className="flex min-w-0 grow flex-col gap-3 p-4 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <div className="flex flex-wrap gap-2">
                        {isPublished ? (
                          <span className="rounded-full bg-cypher-green/10 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-cypher-green">
                            公開中
                          </span>
                        ) : isPending ? (
                          <span className="rounded-full bg-cypher-yellow/35 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-ink/70">
                            運営の承認待ち
                          </span>
                        ) : (
                          <span className="rounded-full bg-ink/10 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-ink/50">
                            非公開
                          </span>
                        )}
                        {isPublished && ev.acceptEntries && (
                          <span className="rounded-full bg-cypher-red/10 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-cypher-red">
                            エントリー受付中
                          </span>
                        )}
                      </div>
                      <p className={`display truncate text-xl font-black ${isPending ? "text-ink/70" : "text-ink"}`}>
                        {ev.title}
                      </p>
                      <p className="text-[13px] text-ink/50">
                        {ev.venue || "会場未定"}
                        {ev.deadline ? ` ・ 締切 ${ev.deadline.slice(5).replace("-", "/")}` : ""}
                        {isPending ? " ・ 承認されるとサイトに公開されます" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ev.acceptEntries && (
                        <Link
                          href={`/organizer/events/${ev.id}/entries`}
                          className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-extrabold text-paper transition hover:opacity-85"
                        >
                          エントリーリスト
                        </Link>
                      )}
                      <Link
                        href={`/organizer/events/${ev.id}/edit`}
                        className="rounded-full border border-ink/20 px-5 py-2.5 text-[13px] font-bold text-ink transition hover:bg-ink/5"
                      >
                        編集
                      </Link>
                      {isPublished && (
                        <a
                          href={`/ja/events/${ev.id}`}
                          target="_blank"
                          rel="noopener"
                          className="rounded-full border border-ink/20 px-5 py-2.5 text-[13px] font-bold text-ink transition hover:bg-ink/5"
                        >
                          公開ページ ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {ev.acceptEntries && (
                    <div className="flex items-center gap-4">
                      <div className="h-2 grow overflow-hidden rounded-full bg-ink/10">
                        <div
                          className="h-2 rounded-full bg-cypher-red"
                          style={{
                            width: ev.entryCapacity
                              ? `${Math.min(100, Math.round((ev.entryCount / ev.entryCapacity) * 100))}%`
                              : ev.entryCount > 0
                                ? "100%"
                                : "0%",
                          }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-[13px] font-extrabold text-ink">
                        {ev.entryCount}
                        {ev.entryCapacity ? ` / ${ev.entryCapacity}` : ""} 名
                        {ev.waitlistCount > 0 && (
                          <span className="font-bold text-ink/45"> ・ 待ち{ev.waitlistCount}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
