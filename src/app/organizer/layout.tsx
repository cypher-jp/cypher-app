import type { Metadata } from "next";
import Link from "next/link";
import "../globals.css";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { organizerSignOutAction } from "@/app/organizer/actions";

export const metadata: Metadata = {
  title: "主催者ページ | WORLD Cypher.",
  robots: { index: false, follow: false },
};

export default async function OrganizerLayout({
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
            <Link href="/organizer" className="display text-xl font-black tracking-tight">
              <span className="text-cypher-red">WORLD</span> Cypher
              <span className="text-cypher-red">.</span>
              <span className="ml-2 text-xs font-bold uppercase tracking-widest text-paper/60">
                Organizer
              </span>
            </Link>
            {user && (
              <div className="flex items-center gap-4 text-sm">
                <span className="hidden text-paper/70 sm:inline">{user.email}</span>
                <form action={organizerSignOutAction}>
                  <button
                    type="submit"
                    className="btn-ghost border-paper/30 text-paper hover:bg-paper hover:text-ink"
                  >
                    ログアウト
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        <footer className="border-t border-ink/10 px-6 py-4 text-center text-xs text-ink/40">
          WORLD Cypher. 主催者ページ — エントリー管理は無料でご利用いただけます
        </footer>
      </body>
    </html>
  );
}
