"use client";

import { useRef, useState, useTransition } from "react";
import {
  bulkSetFlyerAction,
  bulkUpdateGenresAction,
  bulkUpdateTypeAction,
} from "@/app/admin/actions";
import { ADMIN_EVENT_TYPE_LABEL, ADMIN_GENRE_LABEL } from "@/lib/admin/labels";
import { EVENT_TYPES, GENRES, type EventType, type Genre } from "@/types/event";

interface Props {
  selectedIds: string[];
  /** 適用完了後に選択をクリアしてもらうためのコールバック */
  onDone: () => void;
}

/**
 * 一括編集ツールバー。チェックしたイベントに対して
 * 「ジャンルの一括変更」「フライヤー画像の一括設定」を行う。
 * (例: オールスタイルになっている大会をまとめてFreestyleへ、
 *  同じイベントの重複行へ同じ画像をまとめて設定 など)
 */
export default function BulkEditToolbar({ selectedIds, onDone }: Props) {
  const [isPending, startTransition] = useTransition();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [type, setType] = useState<EventType | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const count = selectedIds.length;
  const disabled = count === 0 || isPending;

  function toggleGenre(g: Genre) {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((v) => v !== g) : [...prev, g],
    );
  }

  function applyGenres() {
    if (disabled || genres.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      await bulkUpdateGenresAction(selectedIds, genres);
      setMessage(`${count}件のジャンルを変更しました`);
      setGenres([]);
      onDone();
    });
  }

  function applyType() {
    if (disabled || !type) return;
    setMessage(null);
    startTransition(async () => {
      await bulkUpdateTypeAction(selectedIds, type as EventType);
      setMessage(`${count}件の種別を変更しました`);
      setType("");
      onDone();
    });
  }

  function applyFlyer() {
    const file = fileRef.current?.files?.[0];
    if (disabled || !file) return;
    setMessage(null);
    const formData = new FormData();
    formData.set("flyer", file);
    startTransition(async () => {
      await bulkSetFlyerAction(selectedIds, formData);
      setMessage(`${count}件に画像を設定しました`);
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-ink/10 bg-ink/[0.03] p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-ink/50">
        一括編集({count}件選択中)
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {GENRES.map((g) => (
          <label key={g} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={genres.includes(g)}
              onChange={() => toggleGenre(g)}
            />
            {ADMIN_GENRE_LABEL[g]}
          </label>
        ))}
        <button
          type="button"
          onClick={applyGenres}
          disabled={disabled || genres.length === 0}
          className="btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "適用中..." : `選択${count}件をこのジャンルにする`}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EventType | "")}
          className="rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-xs"
        >
          <option value="">種別を選ぶ...</option>
          {EVENT_TYPES.map((v) => (
            <option key={v} value={v}>
              {ADMIN_EVENT_TYPE_LABEL[v]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={applyType}
          disabled={disabled || !type}
          className="btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "適用中..." : `選択${count}件をこの種別にする`}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="text-xs file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-paper"
        />
        <button
          type="button"
          onClick={applyFlyer}
          disabled={disabled}
          className="btn-ghost text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "適用中..." : `選択${count}件にこの画像を設定`}
        </button>
      </div>

      {message && <div className="text-xs font-bold text-cypher-green">{message}</div>}
    </div>
  );
}
