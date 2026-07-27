"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  buildEventTypeLabels,
  buildGenreLabels,
  buildRegionLabels,
  DOMESTIC_REGIONS,
  EVENT_TYPES,
  GENRES,
  OVERSEAS_AREA_GROUPS,
  OVERSEAS_REGIONS,
  type EventType,
  type Genre,
  type Region,
} from "@/types/event";

// ジャンル・エリアは複数選択(空配列=絞り込みなし)。
// regionScope は国内/海外タブ自体によるフィルタ。エリアチップが選択されている場合はチップ優先。
export interface FilterState {
  type: EventType | "any";
  genres: Genre[];
  regionScope: "any" | "domestic" | "overseas";
  regions: Region[];
  query: string;
}

export const DEFAULT_FILTER: FilterState = {
  type: "any",
  genres: [],
  regionScope: "any",
  regions: [],
  query: "",
};

type RegionTab = "domestic" | "overseas";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
}

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  resultCount: number;
}

export default function FilterBar({ value, onChange, resultCount }: Props) {
  const t = useTranslations("filters");
  const tType = useTranslations("labels.eventType");
  const tGenre = useTranslations("labels.genre");
  const tRegion = useTranslations("labels.region");

  const typeLabels = buildEventTypeLabels((k) => tType(k));
  const genreLabels = buildGenreLabels((k) => tGenre(k));
  const regionLabels = buildRegionLabels((k) => tRegion(k));

  // 表示するチップ一覧のタブ。タブを押すと同時に regionScope(フィルタ)も切り替わる。
  const [regionTab, setRegionTab] = useState<RegionTab>(
    value.regionScope === "overseas" ? "overseas" : "domestic",
  );

  const reset = () => onChange(DEFAULT_FILTER);
  const hasActive =
    value.type !== "any" ||
    value.genres.length > 0 ||
    value.regionScope !== "any" ||
    value.regions.length > 0 ||
    value.query.trim() !== "";

  // 反対側タブで選択済みのエリア数(タブに件数表示して「見えない選択」を防ぐ)
  const domesticSelected = value.regions.filter((r) =>
    (DOMESTIC_REGIONS as readonly Region[]).includes(r),
  ).length;
  const overseasSelected = value.regions.filter((r) =>
    (OVERSEAS_REGIONS as readonly Region[]).includes(r),
  ).length;

  // タブ押下: 表示リストを切り替えつつ、スコープフィルタも設定。
  // すでにそのスコープが有効な状態でもう一度押すと解除(any)する。
  const handleTab = (tab: RegionTab) => {
    setRegionTab(tab);
    onChange({
      ...value,
      regionScope: value.regionScope === tab ? "any" : tab,
    });
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5 shadow-card">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label={t("type")}
          value={value.type}
          onChange={(v) => onChange({ ...value, type: v as FilterState["type"] })}
          options={[
            { value: "any", label: t("all") },
            ...EVENT_TYPES.map((v) => ({ value: v, label: typeLabels[v] })),
          ]}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
            {t("search")}
          </label>
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            className="rounded-full border border-ink/15 bg-paper px-4 py-2 text-sm focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-ink/50">
          {t("genre")}
        </span>
        <div className="flex flex-wrap gap-2">
          <Chip
            active={value.genres.length === 0}
            onClick={() => onChange({ ...value, genres: [] })}
          >
            {t("all")}
          </Chip>
          {GENRES.map((g) => (
            <Chip
              key={g}
              active={value.genres.includes(g)}
              onClick={() => onChange({ ...value, genres: toggle(value.genres, g) })}
            >
              {genreLabels[g]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-ink/50">
          {t("region")}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            active={value.regions.length === 0 && value.regionScope === "any"}
            onClick={() => onChange({ ...value, regions: [], regionScope: "any" })}
          >
            {t("all")}
          </Chip>
          <Chip
            active={value.regions.includes("online")}
            onClick={() =>
              onChange({ ...value, regions: toggle(value.regions, "online") })
            }
          >
            {regionLabels.online}
          </Chip>
          <span className="mx-1 h-5 w-px bg-ink/10" aria-hidden="true" />
          <div className="inline-flex rounded-full border border-ink/15 p-0.5 text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              aria-pressed={value.regionScope === "domestic"}
              onClick={() => handleTab("domestic")}
              className={
                value.regionScope === "domestic"
                  ? "rounded-full bg-ink px-3 py-1 text-paper"
                  : regionTab === "domestic"
                    ? "rounded-full px-3 py-1 text-ink underline underline-offset-4"
                    : "rounded-full px-3 py-1 text-ink/60 hover:text-ink"
              }
            >
              {t("domestic")}
              {domesticSelected > 0 ? ` (${domesticSelected})` : ""}
            </button>
            <button
              type="button"
              aria-pressed={value.regionScope === "overseas"}
              onClick={() => handleTab("overseas")}
              className={
                value.regionScope === "overseas"
                  ? "rounded-full bg-ink px-3 py-1 text-paper"
                  : regionTab === "overseas"
                    ? "rounded-full px-3 py-1 text-ink underline underline-offset-4"
                    : "rounded-full px-3 py-1 text-ink/60 hover:text-ink"
              }
            >
              {t("overseas")}
              {overseasSelected > 0 ? ` (${overseasSelected})` : ""}
            </button>
          </div>
        </div>
        {regionTab === "domestic" ? (
          <div className="flex flex-wrap gap-2">
            {DOMESTIC_REGIONS.map((r) => (
              <Chip
                key={r}
                active={value.regions.includes(r)}
                onClick={() =>
                  onChange({ ...value, regions: toggle(value.regions, r) })
                }
              >
                {regionLabels[r]}
              </Chip>
            ))}
          </div>
        ) : (
          // 海外は国数が多いため、地域グループごとに小見出しを付けて見やすくする
          <div className="flex flex-col gap-3">
            {OVERSEAS_AREA_GROUPS.map((group) => (
              <div key={group.labelKey}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink/40">
                  {t(group.labelKey)}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {group.regions.map((r) => (
                    <Chip
                      key={r}
                      active={value.regions.includes(r)}
                      onClick={() =>
                        onChange({ ...value, regions: toggle(value.regions, r) })
                      }
                    >
                      {regionLabels[r]}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
        <div className="text-sm">
          <span className="display text-2xl font-black">{resultCount}</span>
          <span className="ml-1 text-xs uppercase tracking-wider text-ink/60">
            {t("resultCount")}
          </span>
        </div>
        {hasActive && (
          <button onClick={reset} className="btn-ghost text-xs">
            {t("reset")}
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={active ? "chip bg-ink text-paper" : "chip-outline hover:border-ink"}
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-ink/15 bg-paper px-4 py-2 text-sm focus:border-ink focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
