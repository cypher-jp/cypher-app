import Link from "next/link";
import { approveEventAction, rejectEventAction } from "@/app/admin/actions";
import {
  ADMIN_EVENT_TYPE_LABEL,
  ADMIN_GENRE_LABEL,
  ADMIN_REGION_LABEL,
} from "@/lib/admin/labels";
import type { DanceEvent } from "@/types/event";

export default function AdminEventCard({ event }: { event: DanceEvent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-card">
      <div className="relative aspect-[16/9] bg-ink">
        {event.flyerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.flyerUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-paper/40">
            <span className="display text-2xl">WORLD Cypher.</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-1.5">
          <span className="chip bg-ink text-paper">
            {ADMIN_EVENT_TYPE_LABEL[event.type]}
          </span>
          <span className="chip-outline">{ADMIN_GENRE_LABEL[event.genre]}</span>
          <span className="chip-outline">{ADMIN_REGION_LABEL[event.region]}</span>
        </div>
        <h3 className="display mt-2 line-clamp-2 text-lg font-black leading-tight">
          {event.title}
        </h3>
        <div className="mt-1 text-sm text-ink/70">{event.date}</div>
        {event.source && (
          <div className="mt-1 text-xs text-ink/50">出典: {event.source}</div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {event.status !== "published" && (
            <form action={approveEventAction.bind(null, event.id)}>
              <button type="submit" className="btn-primary text-xs">
                承認
              </button>
            </form>
          )}
          <Link
            href={`/admin/events/${event.id}/edit`}
            className="btn-ghost text-xs"
          >
            編集
          </Link>
          {event.status !== "draft" && (
            <form action={rejectEventAction.bind(null, event.id)}>
              <button type="submit" className="btn-ghost text-xs">
                却下
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
