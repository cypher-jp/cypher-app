"use client";

import { useFormStatus } from "react-dom";

interface Props {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "ghost";
}

/**
 * サーバーアクション用の送信ボタン。押した瞬間に「処理中...」表示＋二重押し防止になり、
 * サーバー処理を待つ間も操作が受け付けられたことがすぐ分かる。
 */
export default function SubmitButton({
  label,
  pendingLabel = "処理中...",
  variant = "primary",
}: Props) {
  const { pending } = useFormStatus();
  const base = variant === "primary" ? "btn-primary" : "btn-ghost";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${base} text-xs disabled:cursor-wait disabled:opacity-50`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
