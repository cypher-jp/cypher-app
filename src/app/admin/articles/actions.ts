"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadFlyer } from "@/lib/admin/events";
import {
  insertArticle,
  updateArticle,
  fetchAdminArticleById,
  type ArticleInput,
} from "@/lib/admin/articles";
import {
  ARTICLE_TYPES,
  isValidSlug,
  type ArticleStatus,
} from "@/types/article";
import { routing } from "@/i18n/routing";

function revalidateArticlePaths(slug?: string) {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`); // トップの「最新記事」枠
    revalidatePath(`/${locale}/articles`);
    if (slug) revalidatePath(`/${locale}/articles/${slug}`);
  }
  revalidatePath("/admin/articles");
}

interface ParsedArticleForm {
  slug: string;
  type: string;
  title: string;
  bodyMd: string;
  relatedEventIds: string[];
  status: ArticleStatus;
  heroFile: File | null;
  existingHeroUrl: string | null;
}

function parseArticleForm(formData: FormData): ParsedArticleForm {
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const typeRaw = String(formData.get("type") ?? "howto");
  const type = (ARTICLE_TYPES as string[]).includes(typeRaw) ? typeRaw : "howto";
  const title = String(formData.get("title") ?? "").trim();
  const bodyMd = String(formData.get("bodyMd") ?? "");
  const statusRaw = String(formData.get("status") ?? "draft");
  const status: ArticleStatus = statusRaw === "published" ? "published" : "draft";

  // 関連イベントID: カンマ・改行区切りで入力(イベント編集画面URLの末尾IDをコピペする運用)
  const relatedEventIds = String(formData.get("relatedEventIds") ?? "")
    .split(/[\s,、]+/)
    .map((v) => v.trim())
    .filter((v) => /^[0-9a-f-]{36}$/i.test(v));

  const heroEntry = formData.get("heroImage");
  const heroFile =
    heroEntry instanceof File && heroEntry.size > 0 ? heroEntry : null;
  const existingHeroUrlRaw = String(formData.get("existingHeroUrl") ?? "").trim();

  return {
    slug,
    type,
    title,
    bodyMd,
    relatedEventIds,
    status,
    heroFile,
    existingHeroUrl: existingHeroUrlRaw || null,
  };
}

function validationError(parsed: ParsedArticleForm): string | null {
  if (!parsed.title) return "タイトルは必須です";
  if (!parsed.slug) return "スラッグ(URL用の英数字)は必須です";
  if (!isValidSlug(parsed.slug))
    return "スラッグは英小文字・数字・ハイフンのみ(例: first-battle-guide)";
  if (!parsed.bodyMd.trim()) return "本文は必須です";
  return null;
}

export async function createArticleAction(formData: FormData): Promise<void> {
  const parsed = parseArticleForm(formData);
  const invalid = validationError(parsed);
  if (invalid) {
    redirect(`/admin/articles/new?error=${encodeURIComponent(invalid)}`);
  }

  const supabase = createSupabaseServerClient();
  let heroImageUrl: string | null = parsed.existingHeroUrl;
  if (parsed.heroFile) {
    try {
      heroImageUrl = await uploadFlyer(supabase, parsed.heroFile);
    } catch (e) {
      const message = e instanceof Error ? e.message : "画像のアップロードに失敗しました";
      redirect(`/admin/articles/new?error=${encodeURIComponent(message)}`);
    }
  }

  const input: ArticleInput = {
    slug: parsed.slug,
    type: parsed.type,
    title: parsed.title,
    bodyMd: parsed.bodyMd,
    heroImageUrl,
    relatedEventIds: parsed.relatedEventIds,
    status: parsed.status,
    publishedAt: parsed.status === "published" ? new Date().toISOString() : null,
  };

  const result = await insertArticle(input);
  if (!result) {
    redirect(
      `/admin/articles/new?error=${encodeURIComponent("保存に失敗しました(スラッグの重複の可能性)")}`,
    );
  }

  revalidateArticlePaths(parsed.slug);
  redirect("/admin/articles");
}

export async function updateArticleAction(
  id: string,
  formData: FormData,
): Promise<void> {
  const parsed = parseArticleForm(formData);
  const invalid = validationError(parsed);
  if (invalid) {
    redirect(`/admin/articles/${id}/edit?error=${encodeURIComponent(invalid)}`);
  }

  const existing = await fetchAdminArticleById(id);
  const supabase = createSupabaseServerClient();

  let heroImageUrl: string | null = parsed.existingHeroUrl;
  if (parsed.heroFile) {
    try {
      heroImageUrl = await uploadFlyer(supabase, parsed.heroFile);
    } catch (e) {
      const message = e instanceof Error ? e.message : "画像のアップロードに失敗しました";
      redirect(`/admin/articles/${id}/edit?error=${encodeURIComponent(message)}`);
    }
  }

  const input: ArticleInput = {
    slug: parsed.slug,
    type: parsed.type,
    title: parsed.title,
    bodyMd: parsed.bodyMd,
    heroImageUrl,
    relatedEventIds: parsed.relatedEventIds,
    status: parsed.status,
    // 公開初回のみ published_at をセット(既に公開日時があれば維持)
    publishedAt:
      parsed.status === "published" && !existing?.publishedAt
        ? new Date().toISOString()
        : null,
  };

  const ok = await updateArticle(id, input);
  if (!ok) {
    redirect(
      `/admin/articles/${id}/edit?error=${encodeURIComponent("保存に失敗しました(スラッグの重複の可能性)")}`,
    );
  }

  // スラッグ変更時に旧URLも再検証されるよう、既存スラッグと新スラッグの両方を対象にする
  if (existing && existing.slug !== parsed.slug) {
    revalidateArticlePaths(existing.slug);
  }
  revalidateArticlePaths(parsed.slug);
  redirect("/admin/articles");
}
