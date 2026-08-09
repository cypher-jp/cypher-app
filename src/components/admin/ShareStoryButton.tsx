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
 *
 * クリップボードはiOS Safariで静かに失敗することがあるため、
 * 新旧2方式で試し、失敗時はURLを画面に出して再コピーできるようにしている。
 */
export default function ShareStoryButton({ flyerUrl, eventUrl, title }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  /** 新旧2方式でコピーを試みる。成功したらtrue */
  async function copyEventUrl(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(eventUrl);
      return true;
    } catch {
      // 旧方式(execCommand)にフォールバック
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = eventUrl;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, eventUrl.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function handleShare() {
    if (status === "working") return;
    setStatus("working");
    setMessage(null);

    // リンクスタンプ用URLを先にコピー(共有後はページ操作できないため)。
    // 結果をその場で表示して「コピーされたつもり」事故を防ぐ。
    const copied = await copyEventUrl();
    setCopyFailed(!copied);
    setMessage(
      copied
        ? "イベントURLをコピーしました。ストーリーのリンクスタンプで貼り付けてください"
        : "URLの自動コピーに失敗しました。下のURLを長押しでコピーしてください",
    );

    try {
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
      } else {
        setStatus("error");
        setMessage(
          "この端末は画像の共有に対応していません。スマホで管理画面を開いて押してください",
        );
      }
    } catch (e) {
      // 共有メニューをキャンセルした場合は静かに戻す(コピー済み表示は残す)
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

  async function handleRecopy() {
    const copied = await copyEventUrl();
    setCopyFailed(!copied);
    setMessage(
      copied
        ? "イベントURLをコピーしました。ストーリーのリンクスタンプで貼り付けてください"
        : "コピーできませんでした。下のURLを長押しで選択してコピーしてください",
    );
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
            status === "error" || copyFailed
              ? "text-cypher-red"
              : "text-cypher-green"
          }`}
        >
          {message}
        </span>
      )}
      {copyFailed && (
        <div className="flex flex-col gap-1">
          <span className="select-all break-all text-[11px] text-ink/70">
            {eventUrl}
          </span>
          <button
            type="button"
            onClick={handleRecopy}
            className="btn-ghost self-start text-[11px]"
          >
            URLを再コピー
          </button>
        </div>
      )}
    </div>
  );
}
