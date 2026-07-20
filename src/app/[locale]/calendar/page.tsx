import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchUpcomingEvents } from "@/lib/supabase";
import CalendarView from "@/components/CalendarView";

export const revalidate = 300;

interface Props {
  params: { locale: string };
}

export default async function CalendarPage({ params }: Props) {
  setRequestLocale(params.locale);
  const t = await getTranslations("calendar");
  // 開催日(JST基準)が今日以降のイベントのみ。過去のイベントは/archiveへ自動で移る。
  const events = await fetchUpcomingEvents();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-ink/60">
          {t("eyebrow")}
        </div>
        <h1 className="display mt-2 text-5xl font-black md:text-7xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-xl text-ink/70">{t("subtitle")}</p>
      </div>

      <div className="mt-10">
        <CalendarView events={events} />
      </div>
    </div>
  );
}
