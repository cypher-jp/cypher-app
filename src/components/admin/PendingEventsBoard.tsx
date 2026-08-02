"use client";

import { useMemo, useState, useTransition } from "react";
import { bulkApproveEventsAction } from "@/app/admin/actions";
import BulkEditToolbar from "@/components/admin/BulkEditToolbar";
import AdminEventGroupCard from "@/components/admin/AdminEventGroupCard";
import { buildDedupeKey, type PendingEventGroup } from "@/lib/admin/dedupe";
import { sortEvents, type EventSortKey } from "@/lib/sortEvents";

interface Props {
  groups: PendingEventGroup[];
  /** 公開済みイベントの重複判定キー(開催日::正規化タイトル)一覧 */
  publishedKeys: string[];
}

// 承認待ちタブ本体。重複候補をまとめたカードを並べ、チェックボックスでの
// 一括承認をここで管理する(サーバーコンポーネントではチェック状態を持てないため
// クライアントコンポーネントに分離)。
export default function PendingEventsBoard({ groups, publishedKeys }: Props) {
  const publishedKeySet = useMemo(() => new Set(publishedKeys), [publishedKeys]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  // default = 登録が新しい順(サーバーの取得順)。代表イベントの値で並び替える。
  const [sort, setSort] = useState<EventSortKey>("default");
  const sortedGroups = useMemo(() => {
    if (sort === "default") return groups;
    const order = new Map(
      sortEvents(groups.map((g) => g.primary), sort).map((e, i) => [e.id, i]),
    );
    return [...groups].sort(
      (a, b) => (order.get(a.primary.id) ?? 0) - (order.get(b.primary.id) ?? 0),
    );
  }, [groups, sort]);

  const allIds = useMemo(() => groups.map((g) => g.primary.id), [groups]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  }

  function handleBulkApprove() {
    if (selectedIds.size === 0 || isPending) return;
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      await bulkApproveEventsAction(ids);
      setSelectedIds(new Set());
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-ink/[0.03] p-4">
        <button
          type="button"
          onClick={toggleAll}
          className="btn-ghost text-xs"
        >
          {allSelected ? "全解除" : "全選択"}
        </button>
        <span className="text-xs text-ink/60">
          {selectedIds.size}件選択中 / 全{allIds.length}件
        </span>
        <button
          type="button"
          onClick={handleBulkApprove}
          disabled={selectedIds.size === 0 || isPending}
          className="btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending
            ? "承認しています..."
            : `選択した${selectedIds.size}件を承認`}
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as EventSortKey)}
          className="ml-auto rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-xs"
        >
          <option value="default">登録が新しい順</option>
          <option value="date">開催日が近い順</option>
          <option value="deadline">締切が近い順</option>
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-6">
          <BulkEditToolbar
            selectedIds={Array.from(selectedIds)}
            onDone={() => setSelectedIds(new Set())}
          />
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedGroups.map((group) => (
          <AdminEventGroupCard
            key={group.key}
            group={group}
            selected={selectedIds.has(group.primary.id)}
            onToggleSelect={() => toggleOne(group.primary.id)}
            publishedDuplicate={publishedKeySet.has(buildDedupeKey(group.primary))}
          />
        ))}
      </div>
    </div>
  );
}
