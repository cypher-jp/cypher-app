"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  buildEventTypeLabels,
  buildGenreLabels,
  buildRegionLabels,
  DOMESTIC_REGIONS,
  EVENT_TYPES,
  GENRES,
  OVERSEAS_REGIONS,
  type EventType,
  type Genre,
  type Region,
} from "@/types/event";

export interface FilterState {
  type: EventType | "any";
  genre: Genre | "any";
  region: Region | "any";
  query: string;
}

export const DEFAULT_FILTER: FilterState = {
  type: "any",
  genre: "any",
  region: "any",
  query: "",
};

type RegionTab = "domestic" | "overseas";

function isOverseasRegion(region: Region | "any"): boolean {
  return (OVERSEAS_REGIONS as readonly string[]).includes(region);
}

function isDomesticRegion(region: Region | "any"): boolean {
  return (DOMESTIC_REGIONS as readonly string[]).includes(region);
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

  // どちらのタブを開くか。海外エリアが選択された状態ならそちらを開いておく。
  const [regionTab, setRegionTab] = useState<RegionTab>(
    isOverseasRegion(value.region) ? "overseas" : "domestic",
  );

  // URL経由などフィルタが外部から変わった時も、選択中のエリアが見えるタブに追従させる。
  useEffect(() => {
    if (isOverseasRegion(value.region)) {
      setRegionTab("overseas");
    } else if (isDomesticRegion(value.region)) {
      setRegionTab("domestic");
    }
  }, [value.region]);

  const reset = () => onChange(DEFAULT_FILTER);
  const hasActive =
    value.type !== "any" ||
    value.genre !== "any" ||
    value.region !== "any" ||
    value.query.trim() !== "";

  const regionList = regionTab === "domestic" ? DOMESTIC_REGIONS : OVERSEAS_REGIONS;

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
            active={value.genre === "any"}
            onClick={() => onChange({ ...value, genre: "any" })}
          >
            {t("all")}
          </Chip>
          {GENRES.map((g) => (
            <Chip
              key={g}
              active={value.genre === g}
              onClick={() => onChange({ ...value, genre: g })}
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
            active={value.region === "any"}
            onClick={() => onChange({ ...value, region: "any" })}
          >
            {t("all")}
          </Chip>
          <Chip
            active={value.region === "online"}
            onClick={() => onChange({ ...value, region: "online" })}
          >
            {regionLabels.online}
          </Chip>
          <span className="mx-1 h-5 w-px bg-ink/10" aria-hidden="true" />
          <div className="inline-flex rounded-full border border-ink/15 p-0.5 text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setRegionTab("domestic")}
              className={
                regionTab === "domestic"
                  ? "rounded-full bg-ink px-3 py-1 text-paper"
                  : "rounded-full px-3 py-1 text-ink/60 hover:text-ink"
              }
            >
              {t("domestic")}
            </button>
            <button
              type="button"
              onClick={() => setRegionTab("overseas")}
              className={
                regionTab === "overseas"
                  ? "rounded-full bg-ink px-3 py-1 text-paper"
                  : "rounded-full px-3 py-1 text-ink/60 hover:text-ink"
              }
            >
              {t("overseas")}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {regionList.map((r) => (
            <Chip
              key={r}
              active={value.region === r}
              onClick={() => onChange({ ...value, region: r })}
            >
              {regionLabels[r]}
            </Chip>
          ))}
        </div>
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
