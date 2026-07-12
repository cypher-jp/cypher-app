import createIntlMiddleware from "next-intl/middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin はi18nルーティングの対象外(日本語のみ・ロケールプレフィックスなし)。
  // Supabase Authのセッションを確認し、未ログインなら /admin/login へ。
  if (pathname.startsWith("/admin")) {
    return handleAdminAuth(request);
  }

  return intlMiddleware(request);
}

async function handleAdminAuth(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase未設定の環境ではログインチェックをスキップしない(安全側に倒し、常にログイン画面へ)。
  if (!url || !anonKey) {
    if (pathname !== "/admin/login") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = pathname === "/admin/login";

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // /admin配下(静的ファイル込み)と、ロケール付きの通常ページの両方にマッチさせる。
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
