import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Article } from "@/types/article";

/** 公開側の記事カード(一覧・トップの最新記事枠・イベント詳細の関連記事枠で共用) */
export default function ArticleCard({ article }: { article: Article }) {
  const t = useTranslations("articles");
  const locale = useLocale();
  const dateText = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group block overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-card transition hover:-translate-y-0.5"
    >
      <div className="relative aspect-[16/9] bg-ink">
        {article.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.heroImageUrl}
            alt={article.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-paper/40">
            <span className="display text-2xl">WORLD Cypher.</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip bg-ink text-paper">{t(`type.${article.type}`)}</span>
          {dateText && <span className="text-xs text-ink/50">{dateText}</span>}
        </div>
        <h3 className="display mt-2 line-clamp-2 text-lg font-black leading-tight">
          {article.title}
        </h3>
      </div>
    </Link>
  );
}
