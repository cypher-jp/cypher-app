"use client";

import type { ReactNode } from "react";

interface Props {
  href: string;
  /** クリック種別: entry=エントリー / instagram=IG確認 / map=Googleマップ */
  kind: "entry" | "instagram" | "map";
  /** どのイベントのボタンか(集計・主催者向けレポート用) */
  eventId: string;
  locale?: string;
  className?: string;
  children: ReactNode;
}

/**
 * クリック計測付き外部リンク。押した瞬間に click_events テーブルへ1行記録してから
 * 通常どおり新規タブで開く。計測が失敗してもリンク動作は一切妨げない。
 * 個人情報は保存しない(イベントID・種別・言語・時刻のみ)。
 */
export default function TrackedLink({
  href,
  kind,
  eventId,
  locale,
  className,
  children,
}: Props) {
  function track() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    try {
      void fetch(`${url}/rest/v1/click_events`, {
        method: "POST",
        // ページ遷移中でも送信が完了するように keepalive を付ける
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
      // 計測失敗は無視(リンク遷移を最優先)
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={track}
    >
      {children}
    </a>
  );
}
