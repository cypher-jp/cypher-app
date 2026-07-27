import Link from "next/link";
import { fetchAdminArticles } from "@/lib/admin/articles";
import {
  ADMIN_ARTICLE_TYPE_LABEL,
  ADMIN_ARTICLE_STATUS_LABEL,
} from "@/types/article";

/** 記事管理: 一覧(下書き含む全件を更新順で表示) */
export default async function AdminArticlesPage() {
  const articles = await fetchAdminArticles();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-3xl font-black">ARTICLES</h1>
        <div className="flex gap-2">
          <Link href="/admin" className="btn-ghost text-sm">
            ← イベント管理へ
          </Link>
          <Link href="/admin/articles/new" className="btn-primary text-sm">
            + 新規記事
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {articles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 p-12 text-center text-ink/60">
            まだ記事がありません。「+ 新規記事」から作成してください。
            <br />
            (テーブルが無い場合は supabase/migrations/009_articles.sql を実行)
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {articles.map((article) => (
              <div
                key={article.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-paper p-4 shadow-card"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`chip ${
                        article.status === "published"
                          ? "bg-ink text-paper"
                          : "bg-ink/10 text-ink/70"
                      }`}
                    >
                      {ADMIN_ARTICLE_STATUS_LABEL[article.status]}
                    </span>
                    <span className="chip-outline">
                      {ADMIN_ARTICLE_TYPE_LABEL[article.type]}
                    </span>
                  </div>
                  <div className="mt-1 truncate font-bold">{article.title}</div>
                  <div className="mt-0.5 text-xs text-ink/50">
                    /articles/{article.slug}
                    {article.publishedAt &&
                      ` ・公開: ${article.publishedAt.slice(0, 10)}`}
                  </div>
                </div>
                <Link
                  href={`/admin/articles/${article.id}/edit`}
                  className="btn-ghost text-xs"
                >
                  編集
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
