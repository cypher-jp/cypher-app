import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 管理画面「ストーリーに投稿」用の画像プロキシ。
 * スクレイピング由来のフライヤーは外部サイトにホストされておりCORSで直接fetchできないため、
 * サーバー経由で取得してブラウザへ返す。ログイン済み管理者のみ利用可(SSRF対策も兼ねる)。
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const src = req.nextUrl.searchParams.get("src") ?? "";
  if (!/^https?:\/\//.test(src)) {
    return new NextResponse("bad request", { status: 400 });
  }

  try {
    const res = await fetch(src, {
      headers: { "user-agent": "WorldCypherBot/1.0 (admin flyer proxy)" },
    });
    if (!res.ok) {
      return new NextResponse("fetch failed", { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("not an image", { status: 415 });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=300",
      },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
