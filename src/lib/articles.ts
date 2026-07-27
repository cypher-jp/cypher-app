import { supabase } from "@/lib/supabase";
import { rowToEvent } from "@/lib/eventMapper";
import type { DanceEvent } from "@/types/event";
import {
  ARTICLE_TYPES,
  type Article,
  type ArticleStatus,
  type ArticleType,
} from "@/types/article";

// SupabaseのDBスキーマ(snake_case) → アプリの型(camelCase) に変換。
export function rowToArticle(row: Record<string, unknown>): Article {
  const typeRaw = String(row.type ?? "howto");
  const type: ArticleType = (ARTICLE_TYPES as string[]).includes(typeRaw)
    ? (typeRaw as ArticleType)
    : "howto";
  const status: ArticleStatus = row.status === "published" ? "published" : "draft";
  const relatedRaw = row.related_event_ids;
  const relatedEventIds = Array.isArray(relatedRaw)
    ? relatedRaw.map((v) => String(v)).filter(Boolean)
    : [];

  return {
    id: String(row.id),
    slug: String(row.slug ?? ""),
    type,
    title: String(row.title ?? ""),
    bodyMd: String(row.body_md ?? ""),
    heroImageUrl: row.hero_image_url ? String(row.hero_image_url) : undefined,
    relatedEventIds,
    status,
    publishedAt: row.published_at ? String(row.published_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/**
 * 公開済み記事を新しい順で取得する(公開側)。
 * RLSにより anon キーでは status='published' のみ読める。
 * Supabase未接続・エラー時は空配列(記事セクションは非表示になるだけでサイトは落ちない)。
 */
export async function fetchPublishedArticles(limit?: number): Promise<Article[]> {
  if (!supabase) return [];
  let query = supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error || !data) {
    // テーブル未作成(migration 009 未適用)でもサイトを落とさない
    console.warn("[supabase] articles fetch skipped:", error?.message);
    return [];
  }
  return data.map(rowToArticle);
}

/** スラッグから公開記事を1件取得する。見つからなければnull */
export async function fetchArticleBySlug(slug: string): Promise<Article | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToArticle(data);
}

/** 記事に紐づく関連イベント(published)を取得する。RLSにより公開イベントのみ返る */
export async function fetchRelatedEvents(
  eventIds: string[],
): Promise<DanceEvent[]> {
  if (!supabase || eventIds.length === 0) return [];
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds);
  if (error || !data) return [];
  return data.map(rowToEvent);
}

/** イベント詳細ページ用: そのイベントを関連に持つ公開記事を取得する(0件なら枠ごと非表示) */
export async function fetchArticlesForEvent(
  eventId: string,
  limit = 3,
): Promise<Article[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .contains("related_event_ids", [eventId])
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(rowToArticle);
}
