"use client";

import { useState } from "react";

interface Props {
  /** フライヤー画像URL(外部サイトの場合もあるため/api/flyer-proxy経由で取得する) */
  flyerUrl: string;
  /** 公開側イベント詳細ページのURL(リンクスタンプ用にクリップボードへコピーする) */
  eventUrl: string;
  title: string;
}

type Status = "idle" | "working" | "done" | "error";

/**
 * 「ストーリーに投稿」ボタン。押すと:
 * 1. イベントページURLをクリップボードへコピー(リンクスタンプ用)
 * 2. フライヤー画像を取得して端末の共有メニューを開く
 * → 共有先でInstagramを選ぶと、画像がセットされた状態でストーリー編集画面が開く。
 * 文字入れ・リンクスタンプはオーナーがインスタ側で行う運用。
 */
export default function ShareStoryButton({ flyerUrl, eventUrl, title }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleShare() {
    if (status === "working") return;
    setStatus("working");
    setMessage(null);
    try {
      // リンクスタンプ用URLを先にコピー(共有後はページ操作できないため)
      try {
        await navigator.clipboard.writeText(eventUrl);
      } catch {
        // クリップボード不可でも共有自体は続行する
      }

      const res = await fetch(
        `/api/flyer-proxy?src=${encodeURIComponent(flyerUrl)}`,
      );
      if (!res.ok) {
        throw new Error("フライヤー画像を取得できませんでした");
      }
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const file = new File([blob], `flyer.${ext}`, {
        type: blob.type || "image/jpeg",
      });

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title });
        setStatus("done");
        setMessage(
          "イベントURLをコピー済み。ストーリーのリンクスタンプに貼り付けてください",
        );
      } else {
        setStatus("error");
        setMessage(
          "この端末は画像の共有に対応していません。スマホで管理画面を開いて押してください",
        );
      }
    } catch (e) {
      // 共有メニューをキャンセルした場合は静かに戻す
      if (e instanceof Error && e.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
      setMessage(
        e instanceof Error ? e.message : "共有に失敗しました。もう一度お試しください",
      );
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={status === "working"}
        className="btn-ghost text-xs disabled:cursor-wait disabled:opacity-50"
      >
        {status === "working" ? "準備中..." : "ストーリーに投稿"}
      </button>
      {message && (
        <span
          className={`text-[11px] ${
            status === "error" ? "text-cypher-red" : "text-cypher-green"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
