import { notFound } from "next/navigation";
import ArticleForm from "@/components/admin/ArticleForm";
import { updateArticleAction } from "@/app/admin/articles/actions";
import { fetchAdminArticleById } from "@/lib/admin/articles";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminEditArticlePage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const article = await fetchAdminArticleById(params.id);
  if (!article) notFound();

  return (
    <div>
      <h1 className="display text-3xl font-black">EDIT ARTICLE</h1>
      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {searchParams.error}
        </div>
      )}
      <div className="mt-6">
        <ArticleForm
          action={updateArticleAction.bind(null, article.id)}
          defaultValues={article}
          submitLabel="更新する"
        />
      </div>
    </div>
  );
}
