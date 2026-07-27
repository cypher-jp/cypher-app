import Link from "next/link";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminEventCard from "@/components/admin/AdminEventCard";
import PendingEventsBoard from "@/components/admin/PendingEventsBoard";
import { fetchAdminEvents, fetchAdminEventCounts } from "@/lib/admin/events";
import { groupPendingEvents } from "@/lib/admin/dedupe";
import { ADMIN_GENRE_LABEL } from "@/lib/admin/labels";
import { GENRES, type EventStatus, type Genre } from "@/types/event";

interface Props {
  searchParams: { tab?: string; genre?: string };
}

export default async function AdminHomePage({ searchParams }: Props) {
  const tab: EventStatus =
    searchParams.tab === "published" || searchParams.tab === "draft"
      ? searchParams.tab
      : "pending";

  // ジャンル絞り込み(全タブ共通)。不正な値は無視して全件表示。
  const genre: Genre | undefined = GENRES.includes(searchParams.genre as Genre)
    ? (searchParams.genre as Genre)
    : undefined;

  const [events, counts] = await Promise.all([
    fetchAdminEvents(tab, genre),
    fetchAdminEventCounts(),
  ]);

  // 承認待ちタブのみ、同一イベントらしき行をまとめて表示する
  // (公開中/却下タブは個別管理のままでよいため対象外)。
  const pendingGroups = tab === "pending" ? groupPendingEvents(events) : [];
  const duplicateGroupCount = pendingGroups.filter(
    (g) => g.others.length > 0,
  ).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-3xl font-black">EVENTS</h1>
        <div className="flex gap-2">
          <Link href="/admin/articles" className="btn-ghost text-sm">
            記事管理
          </Link>
          <Link href="/admin/new" className="btn-primary text-sm">
            + 新規登録
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <AdminTabs current={tab} counts={counts} />
      </div>

      {/* ジャンル絞り込みチップ(公開中タブ含む全タブで有効) */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Link
          href={`/admin?tab=${tab}`}
          className={genre === undefined ? "chip bg-ink text-paper" : "chip-outline"}
        >
          全ジャンル
        </Link>
        {GENRES.map((g) => (
          <Link
            key={g}
            href={`/admin?tab=${tab}&genre=${g}`}
            className={genre === g ? "chip bg-ink text-paper" : "chip-outline"}
          >
            {ADMIN_GENRE_LABEL[g]}
          </Link>
        ))}
      </div>

      {tab === "pending" && duplicateGroupCount > 0 && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          同じイベントらしき重複が {duplicateGroupCount}
          組見つかったため、1枚のカードにまとめて表示しています。
        </div>
      )}

      <div className="mt-6">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 p-12 text-center text-ink/60">
            該当するイベントはありません。
          </div>
        ) : tab === "pending" ? (
          <PendingEventsBoard groups={pendingGroups} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <AdminEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
