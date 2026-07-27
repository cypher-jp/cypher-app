import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import EventGrid from "@/components/EventGrid";
import FeaturedSection from "@/components/FeaturedSection";
import { fetchUpcomingEvents } from "@/lib/supabase";
import { fetchPublishedArticles } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";
import { Link } from "@/i18n/navigation";
import { getUpcomingDeadlines, getWeekendBattles } from "@/lib/featured";
import { EVENT_TYPES, type EventType } from "@/types/event";

export const revalidate = 300; // 5分キャッシュ

interface HomePageProps {
  params: { locale: string };
  searchParams: { type?: string };
}

export default async function HomePage({ params, searchParams }: HomePageProps) {
  setRequestLocale(params.locale);
  // 開催日(JST基準)が今日以降のイベントのみ。過去のイベントは/archiveへ自動で移る。
  const events = await fetchUpcomingEvents();
  const tHome = await getTranslations("home");

  // URLクエリ ?type=... があればそれを初期フィルタに、無ければ battle をデフォルトに。
  const rawType = searchParams.type;
  const initialType: EventType | "any" =
    rawType === "any"
      ? "any"
      : EVENT_TYPES.includes(rawType as EventType)
        ? (rawType as EventType)
        : "battle";

  const weekendBattles = getWeekendBattles(events);
  const upcomingDeadlines = getUpcomingDeadlines(events, 7);
  // 最新記事(公開済み3件)。0件のうちはセクションごと非表示になるので、記事が無くても見た目は変わらない
  const latestArticles = await fetchPublishedArticles(3);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Hero />
      <div className="mt-10 flex min-w-0 flex-col gap-10">
        <FeaturedSection
          title={tHome("weekendBattles")}
          events={weekendBattles}
        />
        <FeaturedSection
          title={tHome("upcomingDeadlines")}
          events={upcomingDeadlines}
        />
      </div>
      <div className="mt-10">
        <EventGrid events={events} initialType={initialType} />
      </div>

      {latestArticles.length > 0 && (
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="display text-xl font-black uppercase tracking-tight">
              {tHome("latestArticles")}
            </h2>
            <Link
              href="/articles"
              className="text-sm font-bold text-cypher-red hover:underline"
            >
              {tHome("viewAllArticles")} →
            </Link>
          </div>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

async function Hero() {
  const t = await getTranslations("hero");

  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink p-10 text-paper md:p-16">
      <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-cypher-red opacity-30 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-cypher-navy opacity-40 blur-3xl" />
      <div className="relative max-w-3xl">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-cypher-yellow">
          {t("eyebrow")}
        </div>
        <h1 className="display mt-4 text-5xl font-black leading-[0.9] md:text-7xl">
          {t("titleLine1")}
          <br />
          {t("titleLine2Prefix")}{" "}
          <span className="text-cypher-red">{t("titleHighlight")}</span>
          {t("titleEnd")}
        </h1>
        <p className="mt-6 max-w-xl text-base text-paper/80">
          {t("subcopyPrefix")}
          {" "}
          <span className="text-cypher-yellow">{t("subcopyHighlight")}</span>
          {" "}
          {t("subcopySuffix")}
        </p>
      </div>
    </section>
  );
}
