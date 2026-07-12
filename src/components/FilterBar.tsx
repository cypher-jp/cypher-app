"use client";

import { useTranslations } from "next-intl";
import {
  buildEventTypeLabels,
  buildGenreLabels,
  buildRegionLabels,
  EVENT_TYPES,
  GENRES,
  REGIONS,
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

  const reset = () => onChange(DEFAULT_FILTER);
  const hasActive =
    value.type !== "any" ||
    value.genre !== "any" ||
    value.region !== "any" ||
    value.query.trim() !== "";

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5 shadow-card">
      <div className="grid gap-3 md:grid-cols-4">
        <Select
          label={t("type")}
          value={value.type}
          onChange={(v) => onChange({ ...value, type: v as FilterState["type"] })}
          options={[
            { value: "any", label: t("all") },
            ...EVENT_TYPES.map((v) => ({ value: v, label: typeLabels[v] })),
          ]}
        />
        <Select
          label={t("genre")}
          value={value.genre}
          onChange={(v) => onChange({ ...value, genre: v as FilterState["genre"] })}
          options={[
            { value: "any", label: t("all") },
            ...GENRES.map((v) => ({ value: v, label: genreLabels[v] })),
          ]}
        />
        <Select
          label={t("region")}
          value={value.region}
          onChange={(v) => onChange({ ...value, region: v as FilterState["region"] })}
          options={[
            { value: "any", label: t("all") },
            ...REGIONS.map((v) => ({ value: v, label: regionLabels[v] })),
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
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
