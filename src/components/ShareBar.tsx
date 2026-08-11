"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  eventId: string;
  title: string;
  /** 共有するイベント詳細ページの完全URL */
  url: string;
  locale?: string;
  /** Googleカレンダー用: 開催日(yyyy-mm-dd) */
  date: string;
  /** 複数日開催の最終日(任意) */
  endDate?: string;
  venue?: string;
}

/** 共有クリックを click_events へ記録する(失敗しても共有動作は妨げない) */
function track(eventId: string, kind: string, locale?: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return;
  try {
    void fetch(`${base}/rest/v1/click_events`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ event_id: eventId, kind, locale: locale ?? null }),
    });
  } catch {
    // 計測失敗は無視
  }
}

/** 日付(yyyy-mm-dd) → Googleカレンダー終日形式(YYYYMMDD) */
function gcalDate(iso: string): string {
  return iso.split("-").join("");
}

/** 終日予定の終了日は「最終日の翌日」を指定する仕様のため1日進める */
function nextDayIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * イベント詳細の共有ボタン列。LINE・X・URLコピー・Googleカレンダー追加。
 * 日本のユーザー比率が高いためLINEを先頭に置く。
 */
export default function ShareBar({
  eventId,
  title,
  url,
  locale,
  date,
  endDate,
  venue,
}: Props) {
  const t = useTranslations("event");
  const [copied, setCopied] = useState(false);

  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const gcalUrl =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${gcalDate(date)}/${gcalDate(nextDayIso(endDate ?? date))}` +
    `&details=${encodeURIComponent(url)}` +
    (venue ? `&location=${encodeURIComponent(venue)}` : "");

  async function copy() {
    track(eventId, "copy", locale);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // clipboard API が使えない環境向けフォールバック
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } finally {
        document.body.removeChild(ta);
      }
    }
    setTimeout(() => setCopied(false), 2000);
  }

  const btn =
    "rounded-full border border-ink/15 px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-widest text-ink/50">
        {t("share")}
      </span>
      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
        onClick={() => track(eventId, "line", locale)}
      >
        LINE
      </a>
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
        onClick={() => track(eventId, "x", locale)}
      >
        X
      </a>
      <button type="button" onClick={copy} className={btn}>
        {copied ? t("copied") : t("copyLink")}
      </button>
      <a
        href={gcalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
        onClick={() => track(eventId, "calendar", locale)}
      >
        {t("addToCalendar")}
      </a>
    </div>
  );
}
