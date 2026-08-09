import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchEventById } from "@/lib/supabase";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { getLocalizedDescription } from "@/lib/eventI18n";
import { isPastEvent } from "@/lib/eventDate";
import InstagramEmbed from "@/components/InstagramEmbed";
import ArticleCard from "@/components/ArticleCard";
import { fetchArticlesForEvent } from "@/lib/articles";
import { routing } from "@/i18n/routing";
import { buildEventTypeLabels, buildGenreLabels, buildRegionLabels, getEventGenres } from "@/types/event";

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
  const tArticles = await getTranslations("articles");
  // このイベントを関連に持つ公開記事(0件なら枠ごと非表示)
  const relatedArticles = await fetchArticlesForEvent(event.id);

  // 過去イベントも直接URLでは開ける(SEO資産として残す)。表示上だけ終了扱いにする。
  const eventEnded = isPastEvent(event.date);
  const dateText = formatDate(event.date, params.locale);
  // adminの「締め切りました」フラグ(entryClosed)は締切日と無関係に受付終了として扱う
  const deadlinePassed =
    event.entryClosed === true ||
    (event.deadline
      ? new Date(event.deadline).getTime() < Date.now()
      : false);
  const deadlineText = event.deadline
    ? deadlinePassed
      ? t("deadlinePassed")
      : formatDate(event.deadline, params.locale)
    : event.entryClosed === true
      ? t("deadlinePassed")
      : null;

  const localizedDescription = getLocalizedDescription(event, params.locale);

  const eventUrl = `${SITE_URL}/${params.locale}/events/${event.id}`;
  // region が online の回はオンライン開催として出す(会場情報が実在しないため)。
  const isOnlineEvent = event.region === "online";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.date,
    // 当サイトのデータは開催日を1日しか持たないため、終了日は開催日と同じ扱いにする。
    endDate: event.date,
    eventAttendanceMode: isOnlineEvent
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: isOnlineEvent
      ? {
          "@type": "VirtualLocation",
          url: event.entryUrl ?? eventUrl,
        }
      : {
          "@type": "Place",
          name: event.venue,
          address: event.venue,
        },
    ...(event.flyerUrl ? { image: [event.flyerUrl] } : {}),
    description: localizedDescription,
    // エントリー先が分かる回のみ offers を出す。参加費は当サイトで保持していないため
    // price/priceCurrency は付けない(推測値を書くと実際の料金と食い違うため)。
    ...(event.entryUrl
      ? {
          offers: {
            "@type": "Offer",
            url: event.entryUrl,
            availability: deadlinePassed
              ? "https://schema.org/SoldOut"
              : "https://schema.org/InStock",
            ...(event.deadline ? { validThrough: event.deadline } : {}),
          },
        }
      : {}),
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
          {eventEnded && (
            <div className="mb-4 inline-block rounded-full bg-ink/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-ink/60">
              {t("endedNotice")}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <span className="chip bg-ink text-paper">
              {typeLabels[event.type]}
            </span>
            {getEventGenres(event).map((g) => (
              <span key={g} className="chip-outline">
                {genreLabels[g]}
              </span>
            ))}
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

      {relatedArticles.length > 0 && (
        <section className="mx-auto mt-10 max-w-4xl">
          <h2 className="display text-xl font-black uppercase tracking-tight">
            {tArticles("relatedArticles")}
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}
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
