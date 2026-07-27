/**
 * 依存ライブラリなしの簡易Markdown→HTML変換。
 * 記事本文(オーナー自身が書く信頼できるテキスト)専用。
 * 対応構文: 見出し(## ###)、段落、箇条書き(- )、番号リスト(1. )、
 * 強調(**太字**)、リンク([text](url))、画像(![alt](url))、区切り線(---)。
 * それ以外の構文は素のテキストとして表示される(HTMLタグは全てエスケープ済みなので安全)。
 * 本格的なMarkdown対応が必要になったら、オーナー確認のうえ remark 等の導入を検討する。
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** インライン構文(太字・画像・リンク)を変換する。入力はエスケープ済み前提 */
function renderInline(text: string): string {
  let out = text;
  // 画像 ![alt](url) — http(s)のみ許可
  out = out.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    '<img src="$2" alt="$1" class="my-4 w-full rounded-xl" loading="lazy" />',
  );
  // リンク [text](url) — http(s)のみ許可
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cypher-red underline underline-offset-2">$1</a>',
  );
  // 太字 **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return out;
}

export function markdownToHtml(markdown: string): string {
  const lines = escapeHtml(markdown.replace(/\r\n/g, "\n")).split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(
        `<p class="mt-4 leading-relaxed">${renderInline(paragraph.join("<br />"))}</p>`,
      );
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      html.push(listType === "ul" ? "</ul>" : "</ol>");
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push('<hr class="my-8 border-ink/10" />');
      continue;
    }
    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      flushParagraph();
      closeList();
      html.push(`<h3 class="mt-8 text-lg font-bold">${renderInline(h3[1])}</h3>`);
      continue;
    }
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      flushParagraph();
      closeList();
      html.push(
        `<h2 class="display mt-10 text-2xl font-black tracking-tight">${renderInline(h2[1])}</h2>`,
      );
      continue;
    }
    const ul = trimmed.match(/^[-*]\s+(.+)$/);
    if (ul) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        html.push('<ul class="mt-4 list-disc space-y-1 pl-6">');
        listType = "ul";
      }
      html.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }
    const ol = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        html.push('<ol class="mt-4 list-decimal space-y-1 pl-6">');
        listType = "ol";
      }
      html.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }
    closeList();
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  return html.join("\n");
}
