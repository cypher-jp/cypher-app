import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchEventById } from "@/lib/supabase";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { getLocalizedDescription } from "@/lib/eventI18n";
import InstagramEmbed from "@/components/InstagramEmbed";
import { routing } from "@/i18n/routing";
import { buildEventTypeLabels, buildGenreLabels, buildRegionLabels } from "@/types/event";

export const revalidate = 300;

interface PageProps {
  params: { locale: string; id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, id } = params;
  const event = await fetchEventById(id);
  const t = await getTranslations({ locale, namespace: "event" });

  if (!event) {
    return { title: `${t("metaFallbackTitle")} | ${SITE_NAME}` };
  }

  const localizedDescription = getLocalizedDescription(event, locale);
  const description =
    localizedDescription?.trim().slice(0, 120) ||
    t("metaFallbackDescription", { title: event.title });
  const title = `${event.title} | ${SITE_NAME}`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}/events/${id}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/events/${id}`,
      languages,
    },
    openGraph: {
      title,
      description,
      type: "article",
      images: event.flyerUrl ? [{ url: event.flyerUrl }] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  setRequestLocale(params.locale);
  const event = await fetchEventById(params.id);
  if (!event) notFound();

  const t = await getTranslations("event");
  const tType = await getTranslations("labels.eventType");
  const tGenre = await getTranslations("labels.genre");
  const tRegion = await getTranslations("labels.region");

  const typeLabels = buildEventTypeLabels((k) => tType(k));
  const genreLabels = buildGenreLabels((k) => tGenre(k));
  const regionLabels = buildRegionLabels((k) => tRegion(k));

  const dateText = formatDate(event.date, params.locale);
  const deadlinePassed = event.deadline
    ? new Date(event.deadline).getTime() < Date.now()
    : false;
  const deadlineText = event.deadline
    ? deadlinePassed
      ? t("deadlinePassed")
      : formatDate(event.deadline, params.locale)
    : null;

  const localizedDescription = getLocalizedDescription(event, params.locale);

  const eventUrl = `${SITE_URL}/${params.locale}/events/${event.id}`;
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
    description: localizedDescription,
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
        {t("backToEvents")}
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
              {typeLabels[event.type]}
            </span>
            <span className="chip-outline">{genreLabels[event.genre]}</span>
            <span className="chip-outline">{regionLabels[event.region]}</span>
          </div>

          <h1 className="display mt-4 text-4xl font-black leading-tight md:text-6xl">
            {event.title}
          </h1>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Cell label={t("date")} value={dateText} accent />
            {deadlineText && (
              <Cell
                label={t("deadline")}
                value={deadlineText}
                accent={!deadlinePassed}
              />
            )}
            <Cell label={t("venue")} value={event.venue} />
          </div>

          <div className="mt-10 border-t border-ink/10 pt-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink/60">
              {t("about")}
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-ink/85">
              {localizedDescription}
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
                {t("entryCta")}
              </a>
            ) : event.igPostUrl ? (
              <a
                href={event.igPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                {t("igCta")}
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
                {t("instagramSectionTitle")}
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

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(d);
}
