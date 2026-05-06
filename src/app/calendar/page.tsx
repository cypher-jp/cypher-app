import { fetchEvents } from "@/lib/supabase";
import CalendarView from "@/components/CalendarView";

export const revalidate = 300;

export default async function CalendarPage() {
  const events = await fetchEvents();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-ink/60">
          MONTHLY VIEW
        </div>
        <h1 className="display mt-2 text-5xl font-black md:text-7xl">
          CALENDAR
        </h1>
        <p className="mt-3 max-w-xl text-ink/70">
          月別でイベントを見る。日付セルのバッジは件数。クリックで詳細へ。
        </p>
      </div>

      <div className="mt-10">
        <CalendarView events={events} />
      </div>
    </div>
  );
}
