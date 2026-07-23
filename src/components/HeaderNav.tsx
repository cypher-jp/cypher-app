"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";

const linkClass =
  "rounded-full px-3 py-1.5 uppercase tracking-wider hover:bg-ink hover:text-paper";
const submitClass =
  "rounded-full bg-ink px-3 py-1.5 uppercase tracking-wider text-paper hover:bg-cypher-red";

export default function HeaderNav() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // メニュー外クリック・Escapeキーで閉じる。
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={containerRef} className="flex items-center">
      {/* sm以上: 画面幅に余裕があるのでリンクをそのまま並べる */}
      <nav className="hidden items-center gap-2 text-sm font-bold sm:flex">
        <Link href="/" className={linkClass}>
          {t("events")}
        </Link>
        <Link href="/calendar" className={linkClass}>
          {t("calendar")}
        </Link>
        <Link href="/archive" className={linkClass}>
          {t("archive")}
        </Link>
        <a
          href="https://www.instagram.com/world_cypher/"
          target="_blank"
          rel="noopener noreferrer"
          className={submitClass}
        >
          {t("submit")}
        </a>
        <LocaleSwitcher />
      </nav>

      {/* sm未満: ハンバーガーボタン+開閉メニュー */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("closeMenu") : t("openMenu")}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 sm:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          {open ? (
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M4 7H20M4 12H20M4 17H20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-ink/10 bg-paper px-6 py-4 shadow-card sm:hidden">
          <nav className="flex flex-col gap-1 text-sm font-bold">
            <Link href="/" onClick={close} className={`${linkClass} text-left`}>
              {t("events")}
            </Link>
            <Link href="/calendar" onClick={close} className={`${linkClass} text-left`}>
              {t("calendar")}
            </Link>
            <Link href="/archive" onClick={close} className={`${linkClass} text-left`}>
              {t("archive")}
            </Link>
            <a
              href="https://www.instagram.com/world_cypher/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className={`${submitClass} text-left`}
            >
              {t("submit")}
            </a>
          </nav>
          <div className="mt-3 border-t border-ink/10 pt-3">
            <LocaleSwitcher />
          </div>
        </div>
      )}
    </div>
  );
}
