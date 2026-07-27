import ArticleForm from "@/components/admin/ArticleForm";
import { createArticleAction } from "@/app/admin/articles/actions";

interface Props {
  searchParams: { error?: string };
}

export default function AdminNewArticlePage({ searchParams }: Props) {
  return (
    <div>
      <h1 className="display text-3xl font-black">NEW ARTICLE</h1>
      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {searchParams.error}
        </div>
      )}
      <div className="mt-6">
        <ArticleForm action={createArticleAction} submitLabel="保存する" />
      </div>
    </div>
  );
}
