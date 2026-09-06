import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/service";
import { countActiveEntries } from "@/lib/entries";
import EntryForm from "@/components/EntryForm";
import type { DanceEvent } from "@/types/event";

function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * イベント詳細ページのサイト内エントリーセクション(サーバーコンポーネント)。
 * acceptEntriesがONの公開イベントにのみ表示。締切後・終了後は受付終了表示になる。
 */
export default async function EntrySection({
  event,
  locale,
}: {
  event: DanceEvent;
  locale: string;
}) {
  if (!event.acceptEntries) return null;
  const t = await getTranslations({ locale, namespace: "entry" });

  const today = todayJst();
  const lastDay = event.endDate ?? event.date;
  const closed =
    event.entryClosed === true ||
    (event.deadline ? event.deadline < today : false) ||
    (lastDay ? lastDay < today : false);

  let remaining: number | null = null;
  if (!closed && event.entryCapacity) {
    try {
      const supabase = createServiceClient();
      const active = await countActiveEntries(supabase, event.id);
      remaining = Math.max(0, event.entryCapacity - active);
    } catch {
      remaining = null;
    }
  }

  return (
    <div className="mt-10 border-t border-ink/10 pt-8" id="entry">
      <h2 className="text-xs font-bold uppercase tracking-widest text-ink/60">
        {t("title")}
      </h2>

      {closed ? (
        <p className="mt-3 rounded-xl bg-ink/5 px-4 py-3 text-sm text-ink/60">
          {t("closed")}
        </p>
      ) : (
        <div className="mt-4">
          {remaining !== null && (
            <p className="mb-3 text-sm font-bold">
              {remaining > 0
                ? t("remaining", { count: remaining })
                : t("fullWaitlist")}
            </p>
          )}
          {event.deadline && (
            <p className="mb-3 text-xs text-ink/50">
              {t("deadlineNote", { date: event.deadline })}
            </p>
          )}
          <EntryForm
            eventId={event.id}
            categories={event.entryCategories ?? []}
            cancelBasePath={`/${locale}/entry/cancel`}
            labels={{
              name: t("fieldName"),
              dancerName: t("fieldDancerName"),
              crew: t("fieldCrew"),
              category: t("fieldCategory"),
              email: t("fieldEmail"),
              submit: t("submit"),
              submitting: t("submitting"),
              successEntered: t("successEntered"),
              successWaitlisted: t("successWaitlisted"),
              cancelLinkNote: t("cancelLinkNote"),
              cancelLinkLabel: t("cancelLinkLabel"),
              errorClosed: t("errorClosed"),
              errorDuplicate: t("errorDuplicate"),
              errorInvalid: t("errorInvalid"),
              errorGeneric: t("errorGeneric"),
            }}
          />
        </div>
      )}
    </div>
  );
}
