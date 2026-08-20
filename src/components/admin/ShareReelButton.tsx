"use client";

import { useState } from "react";

interface Props {
  videoUrl: string;
  title?: string;
}

type Status = "idle" | "working" | "done" | "error";

/**
 * 「スマホに保存」ボタン。動画を取得して端末の共有メニューを開く。
 * iPhoneなら共有メニューの「ビデオを保存」で写真アプリへ、
 * そのまま「Instagram」を選べば直接投稿画面にも渡せる。
 * (mp4への<a download>はiOS Safariだとファイルアプリ行き/プレビュー止まりで
 *  写真アプリに入らないため、Web Share APIを使う)
 */
export default function ShareReelButton({ videoUrl, title = "reel" }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleShare() {
    if (status === "working") return;
    setStatus("working");
    setMessage("動画を準備中...(数秒かかります)");
    try {
      const res = await fetch(videoUrl);
      if (!res.ok) throw new Error("動画を取得できませんでした");
      const blob = await res.blob();
      const file = new File([blob], "worldcypher-reel.mp4", {
        type: "video/mp4",
      });
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title });
        setStatus("done");
        setMessage("共有メニューで「ビデオを保存」を押すと写真アプリに入ります");
      } else {
        setStatus("error");
        setMessage("この端末は動画の共有に未対応です。スマホで開くか「DL」を使ってください");
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setStatus("idle");
        setMessage(null);
        return;
      }
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "共有に失敗しました");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={status === "working"}
        className="btn-primary text-xs disabled:cursor-wait disabled:opacity-50"
      >
        {status === "working" ? "準備中..." : "スマホに保存"}
      </button>
      {message && (
        <span
          className={`max-w-[16rem] text-[11px] ${status === "error" ? "text-cypher-red" : "text-ink/70"}`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
