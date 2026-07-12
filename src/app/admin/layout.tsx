import type { Metadata } from "next";
import Link from "next/link";
import "../globals.css";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "管理画面 | WORLD Cypher.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="ja">
      <body className="min-h-screen flex flex-col bg-paper text-ink">
        <header className="border-b border-ink/10 bg-ink text-paper">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/admin" className="display text-xl font-black tracking-tight">
              <span className="text-cypher-red">WORLD</span> Cypher
              <span className="text-cypher-red">.</span>
              <span className="ml-2 text-xs font-bold uppercase tracking-widest text-paper/60">
                Admin
              </span>
            </Link>
            {user && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-paper/70">{user.email}</span>
                <form action={signOutAction}>
                  <button type="submit" className="btn-ghost border-paper/30 text-paper hover:bg-paper hover:text-ink">
                    ログアウト
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
