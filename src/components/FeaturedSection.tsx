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
    <section className="flex flex-col gap-4">
      <h2 className="display text-xl font-black uppercase tracking-tight">
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {events.map((event) => (
          <div key={event.id} className="w-64 shrink-0">
            <EventCard event={event} />
          </div>
        ))}
      </div>
    </section>
  );
}
