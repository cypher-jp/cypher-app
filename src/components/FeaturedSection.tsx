import type { DanceEvent } from "@/types/event";
import EventCard from "@/components/EventCard";

interface Props {
  title: string;
  events: DanceEvent[];
}

/** トップページの特集導線(今週末のバトル、締切間近 等)。該当イベントが無ければ何も描画しない。 */
export default function FeaturedSection({ title, events }: Props) {
  if (events.length === 0) return null;

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="display text-xl font-black uppercase tracking-tight">
        {title}
      </h2>
      {/*
        min-w-0: 親(page.tsxの`flex flex-col`)のflexアイテムとして、この行が
        自身のコンテンツ幅ぶん親を押し広げないようにするための保険。
        overflow-x-auto: カード列自体はここで横スクロールを完結させ、
        ページ全体(body/html)の横スクロールに波及させない。
      */}
      <div className="flex min-w-0 gap-4 overflow-x-auto pb-2">
        {events.map((event) => (
          <div key={event.id} className="w-64 shrink-0">
            <EventCard event={event} />
          </div>
        ))}
      </div>
    </section>
  );
}
