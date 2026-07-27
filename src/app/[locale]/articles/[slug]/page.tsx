import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import EventCard from "@/components/EventCard";
import {
  fetchArticleBySlug,
  fetchRelatedEvents,
} from "@/lib/articles";
import { markdownToHtml } from "@/lib/markdown";
import { filterUpcomingEvents } from "@/lib/eventDate";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 300; // 5分キャッシュ

interface Props {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await fetchArticleBySlug(params.slug);
  if (!article) return {};
  const description = article.bodyMd
    .replace(/[#*\-\[\]()!]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
      type: "article",
      images: article.heroImageUrl ? [article.heroImageUrl] : undefined,
    },
  };
}

/** 記事詳細。本文はMarkdown→簡易HTML変換(src/lib/markdown.ts)。関連イベント枠でクロスセル */
export default async function ArticlePage({ params }: Props) {
  setRequestLocale(params.locale);
  const article = await fetchArticleBySlug(params.slug);
  if (!article) notFound();

  const t = await getTranslations("articles");
  // 関連イベントは開催予定のもののみ表示(終了済みはリンクだけ残しても価値が薄いため非表示)
  const relatedEvents = filterUpcomingEvents(
    await fetchRelatedEvents(article.relatedEventIds),
  );

  const articleUrl = `${SITE_URL}/${params.locale}/articles/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    image: article.heroImageUrl ? [article.heroImageUrl] : undefined,
    mainEntityOfPage: articleUrl,
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/articles" className="text-sm text-ink/50 hover:text-ink">
        ← {t("backToList")}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="chip bg-ink text-paper">{t(`type.${article.type}`)}</span>
        {article.publishedAt && (
          <span className="text-xs text-ink/50">
            {article.publishedAt.slice(0, 10)}
          </span>
        )}
      </div>
      <h1 className="display mt-3 text-3xl font-black leading-tight tracking-tight md:text-4xl">
        {article.title}
      </h1>

      {article.heroImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.heroImageUrl}
          alt={article.title}
          className="mt-6 w-full rounded-2xl"
        />
      )}

      <div
        className="mt-6 text-ink/90"
        // 本文はオーナー自身が書く信頼できるMarkdownで、変換前に全HTMLをエスケープ済み(src/lib/markdown.ts)
        dangerouslySetInnerHTML={{ __html: markdownToHtml(article.bodyMd) }}
      />

      {relatedEvents.length > 0 && (
        <section className="mt-12">
          <h2 className="display text-xl font-black uppercase tracking-tight">
            {t("relatedEvents")}
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {relatedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
