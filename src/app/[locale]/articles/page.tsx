import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ArticleCard from "@/components/ArticleCard";
import { fetchPublishedArticles } from "@/lib/articles";

export const revalidate = 300; // 5分キャッシュ

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "articles" });
  return { title: t("listTitle") };
}

/** 記事一覧。公開済みのみ新しい順(0件のときは空メッセージ) */
export default async function ArticlesPage({ params }: Props) {
  setRequestLocale(params.locale);
  const t = await getTranslations("articles");
  const articles = await fetchPublishedArticles();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="display text-4xl font-black uppercase tracking-tight">
        {t("listTitle")}
      </h1>
      <p className="mt-2 text-ink/60">{t("listLead")}</p>

      <div className="mt-8">
        {articles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 p-12 text-center text-ink/60">
            {t("empty")}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
