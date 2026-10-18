import { NextResponse, type NextRequest } from "next/server";
import { ingestInstagramPost, IngestError, MAX_IMAGES } from "@/lib/igIngest";

/**
 * Instagram投稿 → イベント取り込みの受け口(iPhoneショートカット用)。
 *
 * multipart/form-data でPOSTされる:
 *   note        … 投稿本文(キャプション)
 *   写真 / photo … フライヤー画像(ファイル)。**複数枚可**: 1枚目=フライヤー、2枚目以降=ギャラリー(gallery_urls)
 *   ig_post_url … 投稿URL(任意。あればファイル名にショートコードを使う)
 * 認証: ヘッダー x-ingest-key(または ?key=) が INGEST_SECRET と一致すること。
 *
 * 実際の処理(Gemini抽出 → Storage保存 → events登録/マージ)は src/lib/igIngest.ts に共通化してあり、
 * PC用ブックマークレット(/admin/ig-import)からも同じロジックを使う。
 */
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // --- 認証 ---
  const secret = process.env.INGEST_SECRET;
  const provided = req.headers.get("x-ingest-key") ?? req.nextUrl.searchParams.get("key");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // --- 入力(multipart) ---
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "multipart/form-data expected" }, { status: 400 });
  }
  const note = str(form.get("note") ?? form.get("caption") ?? form.get("text"));
  const igPostUrl = str(form.get("ig_post_url") ?? form.get("url") ?? form.get("post_url"));
  // 複数枚対応: 同じフィールド名の繰り返し(ショートカットでリストを渡した場合)も全て拾う
  const fileEntries: Blob[] = [];
  for (const key of ["写真", "photo", "image", "file", "flyer"]) {
    for (const v of form.getAll(key)) {
      if (v instanceof Blob && v.size > 0) fileEntries.push(v);
    }
  }
  if (fileEntries.length === 0) {
    return NextResponse.json({ ok: false, error: "image file (写真/photo) is required" }, { status: 400 });
  }
  const images = await Promise.all(
    fileEntries.slice(0, MAX_IMAGES).map(async (f) => ({
      buf: Buffer.from(await f.arrayBuffer()),
      mime: f.type && f.type.startsWith("image/") ? f.type : "image/jpeg",
    })),
  );

  try {
    const result = await ingestInstagramPost({ note, igPostUrl, images });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof IngestError) {
      const status = e.stage === "config" ? 500 : e.stage === "input" ? 400 : 502;
      return NextResponse.json({ ok: false, stage: e.stage, error: e.message }, { status });
    }
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}
