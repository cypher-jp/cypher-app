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
 * 黒カード+定員ゲージのデザイン(organizer-entry-uiデザイン案準拠)。
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

  let active = 0;
  if (!closed) {
    try {
      const supabase = createServiceClient();
      active = await countActiveEntries(supabase, event.id);
    } catch {
      active = 0;
    }
  }
  const capacity = event.entryCapacity ?? null;
  const remaining = capacity ? Math.max(0, capacity - active) : null;
  const pct = capacity ? Math.min(100, Math.round((active / capacity) * 100)) : 0;

  return (
    <div className="mt-10" id="entry">
      <div className="rounded-3xl bg-ink p-5 shadow-card sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="display text-2xl font-black tracking-wide text-paper">
            {t("title")}
          </span>
          {!closed && remaining !== null && (
            <span
              className={`rounded-full px-4 py-1.5 text-xs font-extrabold text-paper ${
                remaining > 0 ? "bg-cypher-red" : "bg-cypher-yellow !text-ink"
              }`}
            >
              {remaining > 0 ? t("remaining", { count: remaining }) : t("fullWaitlist")}
            </span>
          )}
        </div>

        {!closed && capacity !== null && (
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-paper/15">
              <div
                className="h-1.5 rounded-full bg-cypher-red"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-paper/55">
              <span>
                {active} / {capacity} ENTRY
              </span>
              {event.deadline && <span>{t("deadlineNote", { date: event.deadline })}</span>}
            </div>
          </div>
        )}
        {!closed && capacity === null && event.deadline && (
          <p className="mt-2 text-[11px] text-paper/55">
            {t("deadlineNote", { date: event.deadline })}
          </p>
        )}

        {closed ? (
          <p className="mt-4 rounded-xl bg-paper/10 px-4 py-3 text-sm text-paper/70">
            {t("closed")}
          </p>
        ) : (
          <div className="mt-5">
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
                emailNote: t("emailNote"),
                submit: t("submit"),
                submitting: t("submitting"),
                noAccountNote: t("noAccountNote"),
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
    </div>
  );
}
