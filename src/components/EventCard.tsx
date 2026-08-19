"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getEventGenres, type DanceEvent } from "@/types/event";

/** NEW / UPDATED バッジ判定。登録(created_at)から7日以内なら NEW、
 *  それ以外で最終更新(updated_at)が7日以内かつ登録から1日以上あとなら UPDATED。 */
export function getFreshness(
  event: Pick<DanceEvent, "createdAt" | "updatedAt">,
  now: number = Date.now(),
): "new" | "updated" | null {
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;
  const created = event.createdAt ? Date.parse(event.createdAt) : NaN;
  const updated = event.updatedAt ? Date.parse(event.updatedAt) : NaN;
  if (!Number.isNaN(created) && now - created < WEEK) return "new";
  if (
    !Number.isNaN(updated) &&
    now - updated < WEEK &&
    (Number.isNaN(created) || updated - created > DAY)
  )
    return "updated";
  return null;
}

const TYPE_ACCENT: Record<DanceEvent["type"], string> = {
  battle: "bg-cypher-red text-paper",
  contest: "bg-cypher-purple text-paper",
  showcase: "bg-cypher-navy text-paper",
  workshop: "bg-cypher-green text-paper",
  audition: "bg-ink text-paper",
  festival: "bg-cypher-yellow text-ink",
};

export default function EventCard({ event }: { event: DanceEvent }) {
  const locale = useLocale();
  const tType = useTranslations("labels.eventType");
  const tGenre = useTranslations("labels.genre");
  const tRegion = useTranslations("labels.region");
  const tBadge = useTranslations("labels.badge");
  const freshness = getFreshness(event);

  const dateObj = new Date(event.date);
  const month = dateObj
    .toLocaleDateString(locale, { month: "short" })
    .toUpperCase();
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  // 複数日開催: 同月なら「AUG 15-20」、月をまたぐなら「AUG 30 - SEP 2」形式で出す
  const endObj = event.endDate ? new Date(event.endDate) : null;
  const endMonth = endObj
    ? endObj.toLocaleDateString(locale, { month: "short" }).toUpperCase()
    : null;
  const dayText = endObj
    ? endMonth === month && endObj.getFullYear() === year
      ? `${day}-${endObj.getDate()}`
      : `${day} - ${endMonth} ${endObj.getDate()}`
    : `${day}`;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-card transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
        {event.flyerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.flyerUrl}
            alt={event.title}
            className="h-full w-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-paper/40">
            <span className="display text-4xl">WORLD Cypher.</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className={`chip ${TYPE_ACCENT[event.type]}`}>
            {tType(event.type)}
          </span>
          {freshness === "new" && (
            <span className="chip bg-cypher-yellow text-ink">
              {tBadge("newEvent")}
            </span>
          )}
          {freshness === "updated" && (
            <span className="chip bg-paper text-ink">
              {tBadge("updatedEvent")}
            </span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/90 to-transparent p-4">
          <div className="display text-3xl font-black leading-none text-paper">
            {month} <span className="text-cypher-red">{dayText}</span>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-paper/70">
            {year}
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="display line-clamp-2 text-lg font-black leading-tight">
          {event.title}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {getEventGenres(event).map((g) => (
            <span key={g} className="chip-outline">
              {tGenre(g)}
            </span>
          ))}
          <span className="chip-outline">{tRegion(event.region)}</span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-ink/70">{event.venue}</p>
      </div>
    </Link>
  );
}
