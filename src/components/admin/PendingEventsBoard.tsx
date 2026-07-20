"use client";

import { useMemo, useState, useTransition } from "react";
import { bulkApproveEventsAction } from "@/app/admin/actions";
import AdminEventGroupCard from "@/components/admin/AdminEventGroupCard";
import type { PendingEventGroup } from "@/lib/admin/dedupe";

interface Props {
  groups: PendingEventGroup[];
}

// 承認待ちタブ本体。重複候補をまとめたカードを並べ、チェックボックスでの
// 一括承認をここで管理する(サーバーコンポーネントではチェック状態を持てないため
// クライアントコンポーネントに分離)。
export default function PendingEventsBoard({ groups }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

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
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <AdminEventGroupCard
            key={group.key}
            group={group}
            selected={selectedIds.has(group.primary.id)}
            onToggleSelect={() => toggleOne(group.primary.id)}
          />
        ))}
      </div>
    </div>
  );
}
