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
    return handleAuthArea(request, "/admin/login", ["/admin/login"]);
  }

  // /organizer(主催者ポータル)も/adminと同じくロケール外・要ログイン。
  // ログイン画面と登録申請画面だけは未ログインでも開ける。
  if (pathname.startsWith("/organizer")) {
    return handleAuthArea(request, "/organizer/login", [
      "/organizer/login",
      "/organizer/apply",
    ]);
  }

  return intlMiddleware(request);
}

async function handleAuthArea(
  request: NextRequest,
  loginPath: string,
  publicPaths: string[],
) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase未設定の環境ではログインチェックをスキップしない(安全側に倒し、常にログイン画面へ)。
  if (!url || !anonKey) {
    if (!publicPaths.includes(pathname)) {
      return NextResponse.redirect(new URL(loginPath, request.url));
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

  const isPublicPage = publicPaths.includes(pathname);

  if (!user && !isPublicPage) {
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (user && pathname === loginPath) {
    return NextResponse.redirect(new URL(loginPath.replace(/\/login$/, ""), request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // /admin配下(静的ファイル込み)と、ロケール付きの通常ページの両方にマッチさせる。
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
