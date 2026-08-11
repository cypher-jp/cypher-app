"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  buildEventTypeLabels,
  buildGenreLabels,
  buildRegionLabels,
  EVENT_TYPES,
  GENRES,
  OVERSEAS_AREA_GROUPS,
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

// 国内エリアの階層グループ(スマホで47チップを一気に並べない)。
// labelKey は messages の filters.<labelKey> に対応する。
const DOMESTIC_AREA_GROUPS: {
  labelKey:
    | "areaHokkaidoTohoku"
    | "areaKantoGroup"
    | "areaChubu"
    | "areaKansaiGroup"
    | "areaChugokuShikoku"
    | "areaKyushuOkinawa";
  regions: Region[];
}[] = [
  { labelKey: "areaHokkaidoTohoku", regions: ["hokkaido", "miyagi", "tohoku"] },
  {
    labelKey: "areaKantoGroup",
    regions: ["tokyo", "kanagawa", "chiba", "saitama", "ibaraki", "kanto"],
  },
  { labelKey: "areaChubu", regions: ["niigata", "hokuriku", "aichi", "tokai"] },
  { labelKey: "areaKansaiGroup", regions: ["kyoto", "osaka", "kansai"] },
  { labelKey: "areaChugokuShikoku", regions: ["hiroshima", "chugoku", "shikoku"] },
  { labelKey: "areaKyushuOkinawa", regions: ["fukuoka", "kyushu", "okinawa"] },
];

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

  // スマホの「絞り込み」ボトムシート開閉
  const [sheetOpen, setSheetOpen] = useState(false);

  // シート表示中は背面のスクロールを止める
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const reset = () => onChange(DEFAULT_FILTER);
  const hasActive =
    value.type !== "any" ||
    value.genres.length > 0 ||
    value.regionScope !== "any" ||
    value.regions.length > 0 ||
    value.query.trim() !== "";

  // 「絞り込み」ボタンに出す適用中の件数(検索語・スコープ以外)
  const refineCount =
    (value.type !== "any" ? 1 : 0) + value.genres.length + value.regions.length;

  const scopeButton = (tab: "domestic" | "overseas", label: string) => (
    <button
      type="button"
      aria-pressed={value.regionScope === tab}
      onClick={() =>
        onChange({ ...value, regionScope: value.regionScope === tab ? "any" : tab })
      }
      className={
        value.regionScope === tab
          ? "rounded-full bg-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-paper"
          : "rounded-full border border-ink/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink/70 hover:text-ink"
      }
    >
      {label}
    </button>
  );

  // 適用中フィルタのチップ(個別解除できる)
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (value.type !== "any") {
    activeChips.push({
      key: `type-${value.type}`,
      label: typeLabels[value.type],
      onRemove: () => onChange({ ...value, type: "any" }),
    });
  }
  for (const g of value.genres) {
    activeChips.push({
      key: `genre-${g}`,
      label: genreLabels[g],
      onRemove: () => onChange({ ...value, genres: toggle(value.genres, g) }),
    });
  }
  for (const r of value.regions) {
    activeChips.push({
      key: `region-${r}`,
      label: regionLabels[r],
      onRemove: () => onChange({ ...value, regions: toggle(value.regions, r) }),
    });
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5 shadow-card">
      {/* 検索(全デバイス共通・最上段) */}
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

      {/* スマホ: 種別/国内海外/絞り込みボタンだけの簡易表示 */}
      <div className="mt-3 flex flex-wrap items-center gap-2 md:hidden">
        <select
          value={value.type}
          onChange={(e) =>
            onChange({ ...value, type: e.target.value as FilterState["type"] })
          }
          className="rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-xs font-bold focus:border-ink focus:outline-none"
        >
          <option value="any">{t("type")}: {t("all")}</option>
          {EVENT_TYPES.map((v) => (
            <option key={v} value={v}>
              {typeLabels[v]}
            </option>
          ))}
        </select>
        {scopeButton("domestic", t("domestic"))}
        {scopeButton("overseas", t("overseas"))}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="rounded-full bg-ink px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-paper"
        >
          {t("refine")}
          {refineCount > 0 ? ` (${refineCount})` : ""}
        </button>
      </div>

      {/* 適用中チップ(スマホ): 1つずつ外せる */}
      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 md:hidden">
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onRemove}
              className="chip bg-ink text-paper"
            >
              {c.label} ×
            </button>
          ))}
        </div>
      )}

      {/* PC: 従来どおり全フィルタを展開表示 */}
      <div className="hidden md:block">
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Select
            label={t("type")}
            value={value.type}
            onChange={(v) => onChange({ ...value, type: v as FilterState["type"] })}
            options={[
              { value: "any", label: t("all") },
              ...EVENT_TYPES.map((v) => ({ value: v, label: typeLabels[v] })),
            ]}
          />
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
                onClick={() =>
                  onChange({ ...value, genres: toggle(value.genres, g) })
                }
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
              onClick={() =>
                onChange({ ...value, regions: [], regionScope: "any" })
              }
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
            {scopeButton("domestic", t("domestic"))}
            {scopeButton("overseas", t("overseas"))}
          </div>
          <RegionGroups
            value={value}
            onChange={onChange}
            regionLabels={regionLabels}
            t={t}
          />
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

      {/* スマホ用ボトムシート */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t("close")}
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-ink/60"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-paper p-6 pb-28">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-ink/15" />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/50">
                {t("type")}
              </span>
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={value.type === "any"}
                  onClick={() => onChange({ ...value, type: "any" })}
                >
                  {t("all")}
                </Chip>
                {EVENT_TYPES.map((v) => (
                  <Chip
                    key={v}
                    active={value.type === v}
                    onClick={() => onChange({ ...value, type: v })}
                  >
                    {typeLabels[v]}
                  </Chip>
                ))}
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
                    onClick={() =>
                      onChange({ ...value, genres: toggle(value.genres, g) })
                    }
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
                  onClick={() =>
                    onChange({ ...value, regions: [], regionScope: "any" })
                  }
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
                {scopeButton("domestic", t("domestic"))}
                {scopeButton("overseas", t("overseas"))}
              </div>
              <RegionGroups
                value={value}
                onChange={onChange}
                regionLabels={regionLabels}
                t={t}
                collapsible
              />
            </div>

            {/* 下部固定の適用バー */}
            <div className="fixed inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-ink/10 bg-paper px-6 py-4">
              <button onClick={reset} className="btn-ghost text-xs">
                {t("reset")}
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="btn-primary"
              >
                {t("showResults", { count: resultCount })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 地域チップの階層表示。国内=地方ブロック、海外=大陸グループごとの小見出し付き。
 * collapsible=true(スマホのシート内)では折りたたみ式にして縦の長さを抑える。
 */
function RegionGroups({
  value,
  onChange,
  regionLabels,
  t,
  collapsible = false,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  regionLabels: Record<Region, string>;
  t: ReturnType<typeof useTranslations<"filters">>;
  collapsible?: boolean;
}) {
  const groups =
    value.regionScope === "overseas" ? OVERSEAS_AREA_GROUPS : DOMESTIC_AREA_GROUPS;

  const chips = (regions: Region[]) => (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {regions.map((r) => (
        <Chip
          key={r}
          active={value.regions.includes(r)}
          onClick={() => onChange({ ...value, regions: toggle(value.regions, r) })}
        >
          {regionLabels[r]}
        </Chip>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const selected = group.regions.filter((r) =>
          value.regions.includes(r),
        ).length;
        const label = (
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40">
            {t(group.labelKey)}
            {selected > 0 ? ` (${selected})` : ""}
          </span>
        );
        if (collapsible) {
          return (
            <details key={group.labelKey} open={selected > 0}>
              <summary className="cursor-pointer select-none list-none">
                {label}
                <span className="ml-1 text-[10px] text-ink/40">▾</span>
              </summary>
              {chips(group.regions)}
            </details>
          );
        }
        return (
          <div key={group.labelKey}>
            {label}
            {chips(group.regions)}
          </div>
        );
      })}
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
