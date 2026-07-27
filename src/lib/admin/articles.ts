import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rowToArticle } from "@/lib/articles";
import type { Article } from "@/types/article";

// 管理画面用の記事CRUD。eventsの src/lib/admin/events.ts と同じ方針
// (server client + authenticated RLS。公開/非公開を問わず全件扱える)。

export async function fetchAdminArticles(): Promise<Article[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error || !data) {
    console.warn("[admin] fetchAdminArticles failed:", error?.message);
    return [];
  }
  return data.map(rowToArticle);
}

export async function fetchAdminArticleById(id: string): Promise<Article | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToArticle(data);
}

export interface ArticleInput {
  slug: string;
  type: string;
  title: string;
  bodyMd: string;
  heroImageUrl: string | null;
  relatedEventIds: string[];
  status: string;
  /** publishedへ切り替えた初回のみセットする(既に値があれば維持) */
  publishedAt: string | null;
}

function toRow(input: ArticleInput): Record<string, unknown> {
  const row: Record<string, unknown> = {
    slug: input.slug,
    type: input.type,
    title: input.title,
    body_md: input.bodyMd,
    hero_image_url: input.heroImageUrl,
    related_event_ids: input.relatedEventIds,
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.publishedAt) row.published_at = input.publishedAt;
  return row;
}

export async function insertArticle(
  input: ArticleInput,
): Promise<{ id: string } | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .insert(toRow(input))
    .select("id")
    .single();
  if (error || !data) {
    console.error("[admin] insertArticle failed:", error?.message);
    return null;
  }
  return { id: String(data.id) };
}

export async function updateArticle(
  id: string,
  input: ArticleInput,
): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("articles")
    .update(toRow(input))
    .eq("id", id);
  if (error) {
    console.error("[admin] updateArticle failed:", error.message);
    return false;
  }
  return true;
}
