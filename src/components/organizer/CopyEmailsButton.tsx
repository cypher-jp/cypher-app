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
    <button type="button" onClick={handleCopy} className="btn-ghost text-xs">
      {copied ? "✓ コピーしました" : `メール一覧をコピー(${emails.length}件)`}
    </button>
  );
}
