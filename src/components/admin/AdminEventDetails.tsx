import type { DanceEvent } from "@/types/event";

/**
 * 管理画面カード用の詳細情報ダイジェスト。
 * AI抽出/手入力済みの項目だけをコンパクトに表示し、承認前に中身を確認できるようにする。
 * 1つも無い場合は「詳細情報なし」を出して、抽出漏れがひと目で分かるようにする。
 */
export default function AdminEventDetails({ event }: { event: DanceEvent }) {
  const rows: { label: string; value: string }[] = [
    { label: "時間", value: event.timeInfo ?? "" },
    { label: "形式", value: event.format ?? "" },
    { label: "ENTRY", value: event.entryFee ?? "" },
    { label: "観覧", value: event.audienceFee ?? "" },
    { label: "枠", value: event.entrySlots ?? "" },
    { label: "JUDGE", value: event.judges ?? "" },
    { label: "DJ", value: event.djs ?? "" },
    { label: "MC", value: event.mc ?? "" },
    { label: "賞", value: event.prize ?? "" },
    { label: "主催", value: event.organizer ?? "" },
  ].filter((r) => r.value.trim().length > 0);

  if (rows.length === 0) {
    return (
      <div className="mt-2 rounded-lg bg-ink/5 px-3 py-2 text-xs text-ink/50">
        詳細情報なし(毎朝7:30のAI抽出で自動追加されます。急ぐ場合は編集から手入力)
      </div>
    );
  }

  return (
    <dl className="mt-2 space-y-0.5 rounded-lg bg-ink/5 px-3 py-2 text-xs leading-relaxed">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-2">
          <dt className="w-12 shrink-0 font-bold uppercase tracking-wider text-ink/50">
            {r.label}
          </dt>
          <dd className="min-w-0 flex-1 break-words text-ink/80">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
