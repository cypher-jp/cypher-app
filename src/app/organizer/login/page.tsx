import Link from "next/link";
import { organizerSignInAction } from "@/app/organizer/actions";

interface Props {
  searchParams: { error?: string; message?: string };
}

export default function OrganizerLoginPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="display text-3xl font-black">主催者ログイン</h1>
      <p className="mt-2 text-sm text-ink/60">
        イベントの掲載とエントリーリストの管理ができます(無料)。
      </p>

      {searchParams.message && (
        <div className="mt-4 rounded-xl border border-ink/10 bg-ink/5 px-4 py-3 text-sm">
          {searchParams.message}
        </div>
      )}
      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {searchParams.error}
        </div>
      )}

      <form action={organizerSignInAction} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
            メールアドレス
          </label>
          <input type="email" name="email" required className="input" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
            パスワード
          </label>
          <input type="password" name="password" required className="input" />
        </div>
        <button type="submit" className="btn-primary">
          ログイン
        </button>
      </form>

      <div className="mt-8 rounded-xl border border-ink/10 p-4 text-sm">
        <p className="font-bold">アカウントをお持ちでない主催者の方へ</p>
        <p className="mt-1 text-ink/60">
          主催者登録(無料)を申請すると、運営の承認後にイベント掲載とエントリー管理が使えるようになります。
        </p>
        <Link href="/organizer/apply" className="btn-ghost mt-3 inline-block">
          主催者登録を申請する
        </Link>
      </div>
    </div>
  );
}
