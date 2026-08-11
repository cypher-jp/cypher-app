import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import EventGrid from "@/components/EventGrid";
import FeaturedSection from "@/components/FeaturedSection";
import { fetchUpcomingEvents } from "@/lib/supabase";
import { fetchPublishedArticles } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";
import { Link } from "@/i18n/navigation";
import { getWeekendBattles } from "@/lib/featured";
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
  const tArticles = await getTranslations("articles");

  // URLクエリ ?type=... があればそれを初期フィルタに、無ければ battle をデフォルトに。
  const rawType = searchParams.type;
  const initialType: EventType | "any" =
    rawType === "any"
      ? "any"
      : EVENT_TYPES.includes(rawType as EventType)
        ? (rawType as EventType)
        : "battle";

  const weekendBattles = getWeekendBattles(events);
  // 最新記事(公開済み3件)。0件でもメディア風のセクション自体は常時表示し、記事一覧へ誘導する
  const latestArticles = await fetchPublishedArticles(3);

  return (
    <div>
      {/* ヒーローは画面幅いっぱいに全幅表示(角丸・余白なし) */}
      <Hero />
      <div className="mx-auto max-w-7xl px-6 py-10">
      {/* 検索(フィルタ付き一覧)をヒーロー直下に置き、探し始めるまでの距離を最短にする */}
      <div className="mt-2">
        <EventGrid events={events} initialType={initialType} />
      </div>
      {/* 今週末のバトル: 出しすぎると縦に長くなるため最大6件+カレンダーへの導線 */}
      {weekendBattles.length > 0 && (
        <div className="mt-14 flex min-w-0 flex-col gap-3">
          <FeaturedSection
            title={tHome("weekendBattles")}
            events={weekendBattles.slice(0, 6)}
          />
          <Link
            href="/calendar"
            className="text-sm font-bold text-cypher-red hover:underline"
          >
            {tHome("viewAllEvents")} →
          </Link>
        </div>
      )}

      {/* メディア(記事)セクション: 記事が1本も無い間は非表示(未完成感を出さない) */}
      {latestArticles.length > 0 && (
      <section className="mt-14 overflow-hidden rounded-3xl bg-ink p-8 text-paper md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-cypher-yellow">
              MEDIA
            </div>
            <h2 className="display mt-1 text-2xl font-black uppercase tracking-tight md:text-3xl">
              {tHome("latestArticles")}
            </h2>
          </div>
          <Link
            href="/articles"
            className="text-sm font-bold text-cypher-red hover:underline"
          >
            {tHome("viewAllArticles")} →
          </Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latestArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
      )}
      </div>
    </div>
  );
}

async function Hero() {
  const t = await getTranslations("hero");

  return (
    <section className="relative overflow-hidden bg-ink">
      {/* 見出しコピーは画像に焼き込み(全言語共通の英語タグライン)。
          SEO・スクリーンリーダー向けに各言語の見出しテキストを不可視で残す */}
      <h1 className="sr-only">
        {t("titleLine1")} {t("titleLine2Prefix")} {t("titleHighlight")}
        {t("titleEnd")}
      </h1>
      <picture>
        {/* スマホは縦構図、PCは横構図の専用画像を出し分ける(CSSクロップはしない) */}
        <source media="(max-width: 767px)" srcSet="/hero-mobile.jpg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-desktop.jpg"
          alt="BATTLES. WORLDWIDE. ONE PLACE."
          className="w-full"
        />
      </picture>
    </section>
  );
}
