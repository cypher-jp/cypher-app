// 記事・ニュース機能の型定義 (docs/ARTICLES_PLAN.md 参照)

export type ArticleType = "howto" | "preview" | "gear" | "report";

export const ARTICLE_TYPES: ArticleType[] = [
  "howto",
  "preview",
  "gear",
  "report",
];

export type ArticleStatus = "draft" | "published";

export const ARTICLE_STATUSES: ArticleStatus[] = ["draft", "published"];

export interface Article {
  id: string;
  /** URL用スラッグ(例: first-battle-guide)。英小文字・数字・ハイフンのみ */
  slug: string;
  type: ArticleType;
  title: string;
  /** Markdown本文(日本語)。表示時に src/lib/markdown.ts で簡易HTMLへ変換する */
  bodyMd: string;
  heroImageUrl?: string;
  /** 関連イベントID(記事⇔イベントの相互リンク枠に使う) */
  relatedEventIds: string[];
  status: ArticleStatus;
  publishedAt?: string; // ISO
  updatedAt?: string; // ISO
}

/** 管理画面用の固定日本語ラベル(adminはi18n対象外) */
export const ADMIN_ARTICLE_TYPE_LABEL: Record<ArticleType, string> = {
  howto: "ハウツー",
  preview: "イベントプレビュー",
  gear: "ギアレビュー",
  report: "レポート",
};

export const ADMIN_ARTICLE_STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "下書き",
  published: "公開中",
};

/** スラッグとして妥当か(英小文字・数字・ハイフンのみ、1〜80文字) */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(slug);
}
