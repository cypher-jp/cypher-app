"use client";

import { useTranslations } from "next-intl";

interface Props {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}

const SIBLING_COUNT = 1;

/**
 * ページ数が多い時に中間を"..."で省略した番号リストを作る。
 * 例: 現在5ページ目・全10ページ → [1, "...", 4, 5, 6, "...", 10]
 */
function buildPageList(current: number, total: number): (number | "...")[] {
  const totalNumbersShown = SIBLING_COUNT * 2 + 5; // 両端2 + 現在の前後 + 現在自身 + ellipsis2つ分の余裕
  if (total <= totalNumbersShown) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(current - SIBLING_COUNT, 2);
  const right = Math.min(current + SIBLING_COUNT, total - 1);

  const pages: (number | "...")[] = [1];
  if (left > 2) pages.push("...");
  for (let p = left; p <= right; p++) pages.push(p);
  if (right < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default function Pagination({ currentPage, totalPages, onChange }: Props) {
  const t = useTranslations("pagination");

  if (totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);

  return (
    <nav
      aria-label="pagination"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="btn-ghost h-9 px-3 text-xs disabled:pointer-events-none disabled:opacity-30"
      >
        {t("prev")}
      </button>

      {pages.map((p, idx) =>
        p === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-1 text-sm font-bold text-ink/40"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={t("pageAria", { page: p })}
            aria-current={p === currentPage ? "page" : undefined}
            onClick={() => onChange(p)}
            className={
              p === currentPage
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-paper"
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 text-sm font-bold text-ink hover:border-ink hover:bg-ink hover:text-paper"
            }
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="btn-ghost h-9 px-3 text-xs disabled:pointer-events-none disabled:opacity-30"
      >
        {t("next")}
      </button>
    </nav>
  );
}
