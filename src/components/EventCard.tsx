"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DanceEvent } from "@/types/event";

const TYPE_ACCENT: Record<DanceEvent["type"], string> = {
  battle: "bg-cypher-red text-paper",
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

  const dateObj = new Date(event.date);
  const month = dateObj
    .toLocaleDateString(locale, { month: "short" })
    .toUpperCase();
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();

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
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/90 to-transparent p-4">
          <div className="display text-3xl font-black leading-none text-paper">
            {month} <span className="text-cypher-red">{day}</span>
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
          <span className="chip-outline">{tGenre(event.genre)}</span>
          <span className="chip-outline">{tRegion(event.region)}</span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-ink/70">{event.venue}</p>
      </div>
    </Link>
  );
}
