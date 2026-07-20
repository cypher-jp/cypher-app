"use client";

import Link from "next/link";
import { approveEventAction, rejectEventAction } from "@/app/admin/actions";
import {
  ADMIN_EVENT_TYPE_LABEL,
  ADMIN_GENRE_LABEL,
  ADMIN_REGION_LABEL,
} from "@/lib/admin/labels";
import type { PendingEventGroup } from "@/lib/admin/dedupe";

interface Props {
  group: PendingEventGroup;
  selected: boolean;
  onToggleSelect: () => void;
}

// 承認待ち一覧の1カード。重複候補(others)がある場合は代表(primary)をメインに表示し、
// 他の候補は折りたたみ内に表示する。折りたたみ内から別の候補を承認すると、
// approveEventAction 側の重複自動却下ロジックにより代表が入れ替わる形になる。
export default function AdminEventGroupCard({
  group,
  selected,
  onToggleSelect,
}: Props) {
  const { primary, others } = group;
  const hasDuplicates = others.length > 0;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-paper shadow-card transition ${
        selected ? "border-ink ring-2 ring-ink/30" : "border-ink/10"
      }`}
    >
      <div className="relative aspect-[16/9] bg-ink">
        <label className="absolute left-3 top-3 z-10 flex cursor-pointer items-center gap-2 rounded-full bg-paper/95 px-3 py-1.5 text-xs font-bold shadow">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 accent-cypher-red"
          />
          選択
        </label>
        {hasDuplicates && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-cypher-red px-3 py-1 text-xs font-bold text-paper">
            重複候補あり({others.length + 1}件)
          </span>
        )}
        {primary.flyerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primary.flyerUrl}
            alt={primary.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-paper/40">
            <span className="display text-2xl">WORLD Cypher.</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-1.5">
          <span className="chip bg-ink text-paper">
            {ADMIN_EVENT_TYPE_LABEL[primary.type]}
          </span>
          <span className="chip-outline">{ADMIN_GENRE_LABEL[primary.genre]}</span>
          <span className="chip-outline">{ADMIN_REGION_LABEL[primary.region]}</span>
        </div>
        <h3 className="display mt-2 line-clamp-2 text-lg font-black leading-tight">
          {primary.title}
        </h3>
        <div className="mt-1 text-sm text-ink/70">{primary.date}</div>
        {primary.venue && (
          <div className="mt-0.5 text-xs text-ink/50">{primary.venue}</div>
        )}
        {primary.source && (
          <div className="mt-1 text-xs text-ink/50">出典: {primary.source}</div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <form action={approveEventAction.bind(null, primary.id)}>
            <button type="submit" className="btn-primary text-xs">
              承認
            </button>
          </form>
          <Link
            href={`/admin/events/${primary.id}/edit`}
            className="btn-ghost text-xs"
          >
            編集
          </Link>
          <form action={rejectEventAction.bind(null, primary.id)}>
            <button type="submit" className="btn-ghost text-xs">
              却下
            </button>
          </form>
        </div>

        {hasDuplicates && (
          <details className="mt-4 rounded-xl border border-ink/10 bg-ink/[0.03] p-3">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-ink/60">
              同じイベントらしき他の候補を見る({others.length}件・現在は自動で非表示中)
            </summary>
            <p className="mt-2 text-xs text-ink/50">
              上のカードを承認すると、ここに並ぶ候補は自動的に「却下/下書き」に回ります。
              もしこちらの内容の方が正しい場合は、該当の候補を承認してください
              (代表が入れ替わり、他の候補が自動で却下されます)。
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {others.map((other) => (
                <div
                  key={other.id}
                  className="rounded-lg border border-ink/10 bg-paper p-3"
                >
                  <div className="text-sm font-bold">{other.title}</div>
                  <div className="mt-0.5 text-xs text-ink/60">
                    {other.date} ・ 出典: {other.source ?? "不明"}
                  </div>
                  {other.venue && (
                    <div className="text-xs text-ink/50">{other.venue}</div>
                  )}
                  {other.flyerUrl && (
                    <div className="mt-1 text-xs text-ink/50">
                      フライヤーあり
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={approveEventAction.bind(null, other.id)}>
                      <button type="submit" className="btn-ghost text-xs">
                        この候補を代表にして承認
                      </button>
                    </form>
                    <Link
                      href={`/admin/events/${other.id}/edit`}
                      className="btn-ghost text-xs"
                    >
                      編集
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
