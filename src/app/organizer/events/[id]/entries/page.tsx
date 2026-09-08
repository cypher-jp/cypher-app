import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchOrganizerProfile, fetchOwnedEvent, fetchEventEntries } from "@/lib/organizer/data";
import { setEntryStatusAction } from "@/app/organizer/actions";
import CopyEmailsButton from "@/components/organizer/CopyEmailsButton";
import type { EntryRecord } from "@/lib/entries";

interface Props {
  params: { id: string };
}

/** アバターの背景色をエントリーごとにローテーション */
const AVATAR_COLORS = ["bg-ink", "bg-cypher-navy", "bg-cypher-purple", "bg-cypher-green"];

function initials(e: EntryRecord): string {
  const s = (e.dancerName || e.name || "?").trim();
  return s.slice(0, 2).toUpperCase();
}

const GRID = "grid items-center gap-3 px-4 py-3 sm:px-5";
const GRID_COLS = { gridTemplateColumns: "56px 1.5fr 1fr 1fr 1.4fr 130px 200px" } as const;

const ACTION_BTN =
  "rounded-full border border-ink/20 px-3 py-1.5 text-[11px] font-bold text-ink transition hover:bg-ink/5";

function StatusPill({ status }: { status: EntryRecord["status"] }) {
  if (status === "entered")
    return (
      <span className="rounded-full bg-cypher-green/10 px-2.5 py-1 text-[11px] font-extrabold text-cypher-green">
        確定
      </span>
    );
  if (status === "checked_in")
    return (
      <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-extrabold text-paper">
        受付済み
      </span>
    );
  if (status === "waitlisted")
    return (
      <span className="rounded-full bg-cypher-yellow/35 px-2.5 py-1 text-[11px] font-extrabold text-ink/70">
        待ち
      </span>
    );
  return (
    <span className="rounded-full bg-ink/10 px-2.5 py-1 text-[11px] font-extrabold text-ink/45">
      キャンセル
    </span>
  );
}

function EntryActions({ entry }: { entry: EntryRecord }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {entry.status === "entered" && (
        <>
          <form action={setEntryStatusAction.bind(null, entry.id, "checked_in")}>
            <button className={ACTION_BTN}>受付</button>
          </form>
          <form action={setEntryStatusAction.bind(null, entry.id, "cancelled")}>
            <button className={`${ACTION_BTN} !text-cypher-red`}>キャンセル</button>
          </form>
        </>
      )}
      {entry.status === "checked_in" && (
        <form action={setEntryStatusAction.bind(null, entry.id, "entered")}>
          <button className={ACTION_BTN}>受付取消</button>
        </form>
      )}
      {entry.status === "waitlisted" && (
        <>
          <form action={setEntryStatusAction.bind(null, entry.id, "entered")}>
            <button className={ACTION_BTN}>繰り上げ</button>
          </form>
          <form action={setEntryStatusAction.bind(null, entry.id, "cancelled")}>
            <button className={`${ACTION_BTN} !text-cypher-red`}>キャンセル</button>
          </form>
        </>
      )}
      {entry.status === "cancelled" && (
        <form action={setEntryStatusAction.bind(null, entry.id, "entered")}>
          <button className={ACTION_BTN}>復活</button>
        </form>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  number,
  colorIndex,
}: {
  entry: EntryRecord;
  number: string;
  colorIndex: number;
}) {
  const isCancelled = entry.status === "cancelled";
  return (
    <div
      className={`${GRID} border-t border-ink/5 ${isCancelled ? "opacity-45" : ""}`}
      style={GRID_COLS}
    >
      <span className="text-xs font-bold text-ink/40">{number}</span>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-paper ${
            isCancelled ? "bg-ink/25" : AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
          }`}
        >
          {initials(entry)}
        </span>
        <div className="min-w-0">
          <p className={`truncate text-sm font-extrabold ${isCancelled ? "line-through" : ""}`}>
            {entry.dancerName || entry.name}
          </p>
          {entry.dancerName && (
            <p className="truncate text-[11px] text-ink/45">{entry.name}</p>
          )}
        </div>
      </div>
      <span className="truncate text-[13px] text-ink/60">{entry.crew ?? "—"}</span>
      <span>
        {entry.category ? (
          <span className="rounded-full bg-cypher-navy/10 px-2.5 py-1 text-[11px] font-bold text-cypher-navy">
            {entry.category}
          </span>
        ) : (
          <span className="text-[13px] text-ink/30">—</span>
        )}
      </span>
      <span className="truncate text-[13px] text-ink/55">{entry.email}</span>
      <span>
        <StatusPill status={entry.status} />
      </span>
      <EntryActions entry={entry} />
    </div>
  );
}

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
  const checkedIn = entries.filter((e) => e.status === "checked_in");
  const waitlisted = entries.filter((e) => e.status === "waitlisted");
  const cancelled = entries.filter((e) => e.status === "cancelled");
  const activeEmails = [...active, ...waitlisted].map((e) => e.email);

  const capacity = event.entryCapacity ?? null;
  const remaining = capacity ? Math.max(0, capacity - active.length) : null;
  const pct = capacity
    ? Math.min(100, Math.round((active.length / capacity) * 100))
    : active.length > 0
      ? 100
      : 0;

  return (
    <div>
      {/* 黒ヘッダーバンド */}
      <div className="rounded-3xl bg-ink p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <Link href="/organizer" className="text-xs font-bold text-paper/50 hover:text-paper">
              ← マイイベント
            </Link>
            <h1 className="display mt-2 truncate text-3xl font-black text-paper">
              {event.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cypher-red px-3 py-1 text-[11px] font-extrabold tracking-[0.15em] text-white">
                ENTRY LIST
              </span>
              <span className="rounded-full bg-paper/10 px-3 py-1 text-[11px] font-bold text-paper/70">
                {event.date}
              </span>
              {event.venue && (
                <span className="rounded-full bg-paper/10 px-3 py-1 text-[11px] font-bold text-paper/70">
                  {event.venue}
                </span>
              )}
            </div>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex items-end justify-between">
              <span className="text-[11px] font-bold tracking-wider text-paper/50">定員</span>
              <span className="display text-2xl font-black text-paper">
                {active.length}
                {capacity ? <span className="text-paper/45">/{capacity}</span> : ""}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper/15">
              <div className="h-1.5 rounded-full bg-cypher-red" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-paper/55">
              <span>{remaining !== null ? `残り${remaining}枠` : "定員なし"}</span>
              {event.deadline && <span>締切 {event.deadline.slice(5).replace("-", "/")}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 統計カード */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-ink/10 border-t-2 border-t-cypher-green bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold tracking-wider text-ink/45">確定</p>
          <p className="display mt-1 text-3xl font-black">{active.length}</p>
        </div>
        <div className="rounded-2xl border border-ink/10 border-t-2 border-t-cypher-yellow bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold tracking-wider text-ink/45">キャンセル待ち</p>
          <p className="display mt-1 text-3xl font-black">{waitlisted.length}</p>
        </div>
        <div className="rounded-2xl border border-ink/10 border-t-2 border-t-cypher-navy bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold tracking-wider text-ink/45">当日受付済み</p>
          <p className="display mt-1 text-3xl font-black">{checkedIn.length}</p>
        </div>
        <div className="rounded-2xl border border-ink/10 border-t-2 border-t-ink/25 bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold tracking-wider text-ink/45">キャンセル</p>
          <p className="display mt-1 text-3xl font-black text-ink/50">{cancelled.length}</p>
        </div>
      </div>

      {/* ツールバー */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-[12px] font-bold text-ink/55">
          <span className="rounded-full bg-ink px-3.5 py-1.5 text-paper">
            すべて {entries.length}
          </span>
          <span className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5">
            確定 {active.length}
          </span>
          <span className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5">
            待ち {waitlisted.length}
          </span>
          <span className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5">
            キャンセル {cancelled.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyEmailsButton emails={activeEmails} />
          <a
            href={`/organizer/events/${event.id}/entries/csv`}
            className="flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold text-ink shadow-card transition hover:bg-ink/5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV
          </a>
        </div>
      </div>

      {/* リスト */}
      {entries.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-ink/20 bg-white p-10 text-center text-sm text-ink/50">
          まだエントリーがありません。イベントが公開されると、イベントページからエントリーできるようになります。
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[880px] rounded-2xl border border-ink/10 bg-white shadow-card">
            <div
              className={`${GRID} text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink/40`}
              style={GRID_COLS}
            >
              <span>NO.</span>
              <span>ダンサー</span>
              <span>クルー</span>
              <span>部門</span>
              <span>メール</span>
              <span>状態</span>
              <span>操作</span>
            </div>

            {active.map((e, i) => (
              <EntryRow
                key={e.id}
                entry={e}
                number={String(i + 1).padStart(2, "0")}
                colorIndex={i}
              />
            ))}

            {waitlisted.length > 0 && (
              <div className="flex items-center gap-2 border-t border-ink/5 bg-cypher-yellow/15 px-5 py-2.5">
                <span className="h-2 w-2 rounded-full bg-cypher-yellow" />
                <span className="text-[11px] font-extrabold tracking-wide text-ink/60">
                  キャンセル待ち — 枠が空くと上から自動で繰り上がります
                </span>
              </div>
            )}
            {waitlisted.map((e, i) => (
              <EntryRow key={e.id} entry={e} number={`W${i + 1}`} colorIndex={active.length + i} />
            ))}

            {cancelled.length > 0 && (
              <div className="border-t border-ink/5 bg-ink/[0.03] px-5 py-2.5">
                <span className="text-[11px] font-extrabold tracking-wide text-ink/40">
                  キャンセル
                </span>
              </div>
            )}
            {cancelled.map((e, i) => (
              <EntryRow
                key={e.id}
                entry={e}
                number="—"
                colorIndex={active.length + waitlisted.length + i}
              />
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-ink/40">
        キャンセルすると、キャンセル待ちの先頭が自動で確定に繰り上がります。
        一斉連絡は「メール一覧をコピー」→ お使いのメールのBCCに貼り付けて送るのが確実です。
      </p>
    </div>
  );
}
