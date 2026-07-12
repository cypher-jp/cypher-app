import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

/**
 * 管理画面(Server Component / Server Action)専用のSupabaseクライアント。
 * anonキー + ユーザーのCookieセッションで動作する(service roleキーは使わない)。
 * RLSの "authenticated" ポリシーによって、ログイン済みユーザーのみ
 * 全ステータスのイベント閲覧・作成・更新・Storageアップロードができる。
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabaseの環境変数(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)が未設定です。管理画面を使うにはVercel/ローカルの環境変数を設定してください。",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component からの読み取り専用呼び出しではCookieを書き込めない。
          // セッションの更新自体は middleware 側で行われるため無視してよい。
        }
      },
    },
  });
}
