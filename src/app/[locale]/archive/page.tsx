import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import EventGrid from "@/components/EventGrid";
import { fetchPastEvents } from "@/lib/supabase";

export const revalidate = 300; // 5分キャッシュ

interface Props {
  params: { locale: string };
}

// 終了したイベントの一覧ページ。データはDBから消さず、表示だけをこちらに切り出す。
export default async function ArchivePage({ params }: Props) {
  setRequestLocale(params.locale);
  const t = await getTranslations("archive");
  // 開催日(JST基準)が今日より前のイベントを、新しい順で取得。
  const events = await fetchPastEvents();

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
        {/* EventGrid内部でuseSearchParamsを使うため、静的書き出し時はSuspenseで包む必要がある */}
        <Suspense fallback={null}>
          <EventGrid events={events} initialType="any" />
        </Suspense>
      </div>
    </div>
  );
}
