"use client";

import { useState } from "react";

/** エントリー者のメールアドレス一覧をクリップボードへコピーする(BCC一斉連絡用) */
export default function CopyEmailsButton({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);
  if (emails.length === 0) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(Array.from(new Set(emails)).join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不可の環境ではプロンプト表示にフォールバック
      window.prompt("以下をコピーしてください", emails.join(", "));
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold text-ink shadow-card transition hover:bg-ink/5"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? "✓ コピーしました" : `メール一覧をコピー(${emails.length}件)`}
    </button>
  );
}
