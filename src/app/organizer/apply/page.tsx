import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyOrganizerAction } from "@/app/organizer/actions";

interface Props {
  searchParams: { error?: string };
}

export default async function OrganizerApplyPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="display text-3xl font-black">主催者登録の申請</h1>
      <p className="mt-2 text-sm text-ink/60">
        承認されると、イベントの掲載申請とエントリーリスト管理(定員・キャンセル待ち・CSV出力)が
        <span className="font-bold">無料</span>で使えます。
      </p>

      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {searchParams.error}
        </div>
      )}

      <form action={applyOrganizerAction} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
            主催者名(チーム・団体名) *
          </label>
          <input type="text" name="name" required className="input" placeholder="例: FRENZY CREW" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
            Instagramアカウント
          </label>
          <input type="text" name="igHandle" className="input" placeholder="例: world_cypher (@は不要)" />
        </div>
        {!user && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
                メールアドレス *
              </label>
              <input type="email" name="email" required className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
                パスワード(8文字以上) *
              </label>
              <input type="password" name="password" required minLength={8} className="input" />
            </div>
          </>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
            ひとこと(主催しているイベント名など)
          </label>
          <textarea name="message" rows={3} className="input" placeholder="例: 毎月◯◯でHIPHOPの1on1を主催しています" />
        </div>
        <button type="submit" className="btn-primary">
          申請する
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/60">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/organizer/login" className="underline">
          ログイン
        </Link>
      </p>
    </div>
  );
}
