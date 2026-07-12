import Link from "next/link";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminEventCard from "@/components/admin/AdminEventCard";
import { fetchAdminEvents, fetchAdminEventCounts } from "@/lib/admin/events";
import type { EventStatus } from "@/types/event";

interface Props {
  searchParams: { tab?: string };
}

export default async function AdminHomePage({ searchParams }: Props) {
  const tab: EventStatus =
    searchParams.tab === "published" || searchParams.tab === "draft"
      ? searchParams.tab
      : "pending";

  const [events, counts] = await Promise.all([
    fetchAdminEvents(tab),
    fetchAdminEventCounts(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-3xl font-black">EVENTS</h1>
        <Link href="/admin/new" className="btn-primary text-sm">
          + 新規登録
        </Link>
      </div>

      <div className="mt-6">
        <AdminTabs current={tab} counts={counts} />
      </div>

      <div className="mt-6">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 p-12 text-center text-ink/60">
            該当するイベントはありません。
          </div>
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
