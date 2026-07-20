import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import EventGrid from "@/components/EventGrid";
import FeaturedSection from "@/components/FeaturedSection";
import { fetchUpcomingEvents } from "@/lib/supabase";
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Hero />
      <div className="mt-10 flex flex-col gap-10">
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
