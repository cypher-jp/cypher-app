import EventGrid from "@/components/EventGrid";
import { fetchEvents } from "@/lib/supabase";
import type { EventType } from "@/types/event";

export const revalidate = 300; // 5分キャッシュ

const VALID_TYPES: EventType[] = [
  "battle",
  "showcase",
  "workshop",
  "audition",
  "festival",
];

interface HomePageProps {
  searchParams: { type?: string };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const events = await fetchEvents();

  // URLクエリ ?type=... があればそれを初期フィルタに、無ければ battle をデフォルトに。
  const rawType = searchParams.type;
  const initialType: EventType | "any" =
    rawType === "any"
      ? "any"
      : VALID_TYPES.includes(rawType as EventType)
        ? (rawType as EventType)
        : "battle";

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Hero />
      <div className="mt-10">
        <EventGrid events={events} initialType={initialType} />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink p-10 text-paper md:p-16">
      <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-cypher-red opacity-30 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-cypher-navy opacity-40 blur-3xl" />
      <div className="relative max-w-3xl">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-cypher-yellow">
          STREET DANCE BATTLE INFO, ONE PLACE
        </div>
        <h1 className="display mt-4 text-5xl font-black leading-[0.9] md:text-7xl">
          FIND YOUR
          <br />
          NEXT <span className="text-cypher-red">BATTLE</span>.
        </h1>
        <p className="mt-6 max-w-xl text-base text-paper/80">
          国内外のダンスバトル情報を
          <span className="text-cypher-yellow">ジャンル × エリア</span>
          で絞り込み。エントリー先まで一直線、広告ゼロ。
        </p>
      </div>
    </section>
  );
}
