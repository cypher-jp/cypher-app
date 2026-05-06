import EventGrid from "@/components/EventGrid";
import { fetchEvents } from "@/lib/supabase";

export const revalidate = 300; // 5分キャッシュ

export default async function HomePage() {
  const events = await fetchEvents();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Hero />
      <div className="mt-10">
        <EventGrid events={events} />
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
          INTERNATIONAL DANCE EVENTS, ONE PLACE
        </div>
        <h1 className="display mt-4 text-5xl font-black leading-[0.9] md:text-7xl">
          FIND YOUR
          <br />
          NEXT <span className="text-cypher-red">CYPHER</span>.
        </h1>
        <p className="mt-6 max-w-xl text-base text-paper/80">
          国内外のバトル、ショーケース、ワークショップ、オーディションを
          <span className="text-cypher-yellow">ジャンル × エリア × 種別</span>
          で絞り込み。広告ゼロ、必要な情報だけ。
        </p>
      </div>
    </section>
  );
}
