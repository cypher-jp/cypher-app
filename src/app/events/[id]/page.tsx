import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchEventById } from "@/lib/supabase";
import {
  EVENT_TYPE_LABEL,
  GENRE_LABEL,
  REGION_LABEL,
} from "@/types/event";

export const revalidate = 300;

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await fetchEventById(params.id);
  if (!event) notFound();

  const dateText = formatDate(event.date);
  const deadlineText = event.deadline ? formatDate(event.deadline) : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/"
        className="text-xs font-bold uppercase tracking-widest text-ink/60 hover:text-ink"
      >
        ← BACK TO EVENTS
      </Link>

      <article className="mt-6 overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-card">
        {event.flyerUrl && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.flyerUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-8 md:p-12">
          <div className="flex flex-wrap gap-2">
            <span className="chip bg-ink text-paper">
              {EVENT_TYPE_LABEL[event.type]}
            </span>
            <span className="chip-outline">{GENRE_LABEL[event.genre]}</span>
            <span className="chip-outline">{REGION_LABEL[event.region]}</span>
          </div>

          <h1 className="display mt-4 text-4xl font-black leading-tight md:text-6xl">
            {event.title}
          </h1>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Cell label="開催日" value={dateText} accent />
            <Cell label="会場" value={event.venue} />
            {deadlineText && (
              <Cell
                label="エントリー締切"
                value={deadlineText}
                accent
              />
            )}
          </div>

          <div className="mt-10 border-t border-ink/10 pt-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink/60">
              About
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-ink/85">
              {event.description}
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {event.entryUrl && (
              <a
                href={event.entryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                エントリーする →
              </a>
            )}
            {event.igPostUrl && (
              <a
                href={event.igPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Instagram投稿を見る
              </a>
            )}
            {event.igHandle && !event.igPostUrl && (
              <a
                href={`https://instagram.com/${event.igHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                @{event.igHandle}
              </a>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-ink/60">
        {label}
      </div>
      <div
        className={`display mt-1 font-black ${
          accent ? "text-cypher-red text-3xl" : "text-2xl"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wd = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getDay()];
  return `${y}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")} (${wd})`;
}
