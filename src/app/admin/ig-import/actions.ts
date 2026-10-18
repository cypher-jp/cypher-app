"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/adminAuth";
import { ingestInstagramPost, IngestError, MAX_IMAGES, type IngestImage } from "@/lib/igIngest";

/** ブックマークレットから渡されるデータ */
export interface IgImportPayload {
  url: string;
  caption: string;
  images: string[];
}

export type IgImportResult =
  | { ok: true; id: string; title: string; merged: boolean; images: number }
  | { ok: false; error: string };

/** 画像のダウンロードを許可するホスト(InstagramのCDNのみ。SSRF対策) */
const ALLOWED_IMAGE_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/**
 * PCのブックマークレット経由の取り込み。
 * ブラウザ側はInstagramのCSPでうちのAPIを直接叩けないので、画像URLだけを受け取り、
 * サーバー側でCDNからダウンロードして通常の取り込み処理に流す。
 */
export async function importInstagramFromUrlsAction(payload: IgImportPayload): Promise<IgImportResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return { ok: false, error: "管理者でログインしてください" };

  const url = String(payload?.url ?? "").trim();
  if (!/^https:\/\/(www\.)?instagram\.com\//.test(url)) {
    return { ok: false, error: "Instagramの投稿URLではありません" };
  }
  const urls = (Array.isArray(payload.images) ? payload.images : [])
    .map((u) => String(u))
    .filter((u) => {
      try {
        const h = new URL(u);
        return h.protocol === "https:" && ALLOWED_IMAGE_HOST.test(h.hostname);
      } catch {
        return false;
      }
    })
    .slice(0, MAX_IMAGES);
  if (urls.length === 0) return { ok: false, error: "取り込める画像URLがありません" };

  const images: IngestImage[] = [];
  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; WorldCypherBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const mime = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
      if (!mime.startsWith("image/")) continue;
      const ab = await res.arrayBuffer();
      if (ab.byteLength === 0 || ab.byteLength > MAX_IMAGE_BYTES) continue;
      images.push({ buf: Buffer.from(ab), mime });
    } catch {
      // 1枚取れなくても残りで続行
    }
  }
  if (images.length === 0) return { ok: false, error: "画像をダウンロードできませんでした(Instagram側の期限切れURLの可能性。投稿を開き直して再実行)" };

  try {
    const result = await ingestInstagramPost({
      note: String(payload.caption ?? "").slice(0, 8000),
      igPostUrl: url,
      images,
    });
    return { ok: true, ...result };
  } catch (e) {
    if (e instanceof IngestError) return { ok: false, error: `${e.stage}: ${e.message}` };
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
