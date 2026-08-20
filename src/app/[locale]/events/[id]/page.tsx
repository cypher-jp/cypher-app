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
import TrackedLink from "@/components/TrackedLink";
import ShareBar from "@/components/ShareBar";
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
  // 複数日開催(endDate持ち)は最終日を過ぎるまで「終了」にしない。
  const eventEnded = isPastEvent(event.endDate ?? event.date);
  const dateText = event.endDate
    ? `${formatDate(event.date, params.locale)} 〜 ${formatDate(event.endDate, params.locale)}`
    : formatDate(event.date, params.locale);
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

  // CTA用リンク: IGは投稿URL優先、無ければプロフィール。会場はGoogleマップ検索へ。
  const igUrl =
    event.igPostUrl ??
    (event.igHandle ? `https://instagram.com/${event.igHandle}` : null);
  const mapsUrl =
    event.region !== "online" && event.venue
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`
      : null;

  const eventUrl = `${SITE_URL}/${params.locale}/events/${event.id}`;
  // 詳細情報の表示行(値が入っている項目のみ)
  const entryMethodLabel = event.entryMethod
    ? t(
        (
          {
            url: "entryMethodUrl",
            dm: "entryMethodDm",
            form: "entryMethodForm",
            onsite: "entryMethodOnsite",
            other: "entryMethodOther",
          } as const
        )[event.entryMethod],
      )
    : null;
  const detailRows: { label: string; value: string }[] = [
    { label: t("time"), value: event.timeInfo ?? "" },
    { label: t("format"), value: event.format ?? "" },
    { label: t("entryFee"), value: event.entryFee ?? "" },
    { label: t("audienceFee"), value: event.audienceFee ?? "" },
    { label: t("entrySlots"), value: event.entrySlots ?? "" },
    { label: t("entryMethod"), value: entryMethodLabel ?? "" },
    { label: t("judges"), value: event.judges ?? "" },
    { label: t("djs"), value: event.djs ?? "" },
    { label: t("mc"), value: event.mc ?? "" },
    { label: t("prize"), value: event.prize ?? "" },
    { label: t("organizer"), value: event.organizer ?? "" },
  ].filter((r) => r.value.trim() !== "");
  // region が online の回はオンライン開催として出す(会場情報が実在しないため)。
  const isOnlineEvent = event.region === "online";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.date,
    // 複数日開催は実際の最終日を出す。単日イベントは開催日と同じ扱い。
    endDate: event.endDate ?? event.date,
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
            {/* 締切情報が無い回も空欄にせず「情報未確認」を明示する(表示不具合と誤認させない) */}
            <Cell
              label={t("deadline")}
              value={deadlineText ?? t("deadlineUnknown")}
              accent={!!deadlineText && !deadlinePassed}
              muted={!deadlineText}
            />
            <Cell label={t("venue")} value={event.venue} />
          </div>

          {/* CTA: エントリーだけを主役(赤)にし、IG・地図は補助ボタンで役割を明示する。
              エントリーURLが無い回はIGリンクをエントリー風に見せず「Instagramで確認」と表示 */}
          <div className="mt-10 flex flex-wrap gap-3">
            {event.entryUrl && (
              <TrackedLink
                href={event.entryUrl}
                kind="entry"
                eventId={event.id}
                locale={params.locale}
                className="btn-primary"
              >
                {t("entryCta")}
              </TrackedLink>
            )}
            {igUrl && (
              <TrackedLink
                href={igUrl}
                kind="instagram"
                eventId={event.id}
                locale={params.locale}
                className="btn-ghost"
              >
                {t("igCheckCta")}
              </TrackedLink>
            )}
            {mapsUrl && (
              <TrackedLink
                href={mapsUrl}
                kind="map"
                eventId={event.id}
                locale={params.locale}
                className="btn-ghost"
              >
                {t("mapCta")}
              </TrackedLink>
            )}
          </div>

          {/* 共有: LINE・X・URLコピー・カレンダー追加(認知獲得の拡散導線) */}
          <div className="mt-6">
            <ShareBar
              eventId={event.id}
              title={event.title}
              url={eventUrl}
              locale={params.locale}
              date={event.date}
              endDate={event.endDate}
              venue={event.venue || undefined}
            />
          </div>

          {/* 詳細情報: 値がある項目だけ出す(空欄は非表示)。IG取り込みのAI抽出/管理画面入力が元 */}
          {detailRows.length > 0 && (
            <div className="mt-10 border-t border-ink/10 pt-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink/60">
                {t("detailsTitle")}
              </h2>
              <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {detailRows.map((row) => (
                  <div key={row.label} className="flex flex-col gap-1">
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-ink/50">
                      {row.label}
                    </dt>
                    <dd className="text-base font-bold leading-snug text-ink">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* 追加画像ギャラリー(管理画面で複数登録した画像)。タップで原寸表示 */}
          {(event.galleryUrls?.length ?? 0) > 0 && (
            <div className="mt-10 border-t border-ink/10 pt-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink/60">
                {t("galleryTitle")}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {event.galleryUrls!.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded-xl object-cover shadow-card transition hover:opacity-90"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 border-t border-ink/10 pt-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink/60">
              {t("about")}
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-ink/85">
              {localizedDescription}
            </p>
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

          {/* 情報の出どころと鮮度を明示する(主催者・ユーザー双方への信頼性表示) */}
          <div className="mt-10 border-t border-ink/10 pt-6 text-xs text-ink/50">
            {t("sourceLabel")}: {sourceName(event.source)}
            {event.updatedAt && (
              <>
                {" ・ "}
                {t("lastChecked")}: {formatDateOnly(event.updatedAt, params.locale)}
              </>
            )}
          </div>
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
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-ink/60">
        {label}
      </div>
      <div
        className={`display mt-1 font-black ${
          muted
            ? "text-xl text-ink/40"
            : accent
              ? "text-cypher-red text-3xl"
              : "text-2xl"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// 取得元キー → 表示名。未知の取得元はそのまま出し、手動登録・不明は運営名義にする。
const SOURCE_NAMES: Record<string, string> = {
  instagram: "Instagram",
  manual: "WORLD Cypher.",
  and8: "and8.dance",
  "breaking-calendar": "Breaking Calendar",
  etstage: "e-tstage",
  choomza: "CHOOMZA",
  "dance-alive": "DANCE ALIVE",
  "dance-delight": "DANCE DELIGHT",
  "hip-hop-international": "Hip Hop International",
  "notorious-ibe": "The Notorious IBE",
};

function sourceName(source?: string): string {
  if (!source) return "WORLD Cypher.";
  return SOURCE_NAMES[source] ?? source;
}

function formatDateOnly(iso: string, locale: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
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
