import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchEventById } from "@/lib/supabase";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import InstagramEmbed from "@/components/InstagramEmbed";
import {
  EVENT_TYPE_LABEL,
  GENRE_LABEL,
  REGION_LABEL,
} from "@/types/event";

export const revalidate = 300;

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const event = await fetchEventById(params.id);

  if (!event) {
    return {
      title: `イベントが見つかりません | ${SITE_NAME}`,
    };
  }

  const description =
    event.description?.trim().slice(0, 120) ||
    `${event.title} の開催日・会場・エントリー情報。`;
  const title = `${event.title} | ${SITE_NAME}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: event.flyerUrl ? [{ url: event.flyerUrl }] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const event = await fetchEventById(params.id);
  if (!event) notFound();

  const dateText = formatDate(event.date);
  const deadlinePassed = event.deadline
    ? new Date(event.deadline).getTime() < Date.now()
    : false;
  const deadlineText = event.deadline
    ? deadlinePassed
      ? "締切済み"
      : formatDate(event.deadline)
    : null;

  const eventUrl = `${SITE_URL}/events/${event.id}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.date,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.venue,
      address: event.venue,
    },
    ...(event.flyerUrl ? { image: [event.flyerUrl] } : {}),
    description: event.description,
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    url: eventUrl,
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/"
        className="text-xs font-bold uppercase tracking-widest text-ink/60 hover:text-ink"
      >
        ← BACK TO EVENTS
      </Link>

      <article className="mt-6 overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-card">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink">
          {event.flyerUrl ? (
            <Image
              src={event.flyerUrl}
              alt={event.title}
              fill
              sizes="(max-width: 1024px) 100vw, 960px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-paper/40">
              <span className="display text-4xl">WORLD Cypher.</span>
            </div>
          )}
        </div>

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

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Cell label="開催日" value={dateText} accent />
            {deadlineText && (
              <Cell
                label="エントリー締切"
                value={deadlineText}
                accent={!deadlinePassed}
              />
            )}
            <Cell label="会場" value={event.venue} />
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
            {event.entryUrl ? (
              <a
                href={event.entryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                ENTRY / 詳細へ →
              </a>
            ) : event.igPostUrl ? (
              <a
                href={event.igPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Instagramで見る
              </a>
            ) : event.igHandle ? (
              <a
                href={`https://instagram.com/${event.igHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                @{event.igHandle}
              </a>
            ) : null}
          </div>

          {event.igPostUrl && (
            <div className="mt-10 border-t border-ink/10 pt-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink/60">
                Instagram
              </h2>
              <div className="mt-4">
                <InstagramEmbed url={event.igPostUrl} />
              </div>
            </div>
          )}
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
