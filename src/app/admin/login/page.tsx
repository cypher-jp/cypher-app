import { signInAction } from "@/app/admin/actions";

interface Props {
  searchParams: { error?: string };
}

export default function AdminLoginPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center py-16">
      <div className="display text-3xl font-black">LOGIN</div>
      <p className="mt-2 text-sm text-ink/60">
        管理画面にログインしてください。
      </p>

      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {searchParams.error}
        </div>
      )}

      <form action={signInAction} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-ink/50">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-full border border-ink/15 bg-paper px-4 py-2 text-sm focus:border-ink focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-ink/50">
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-full border border-ink/15 bg-paper px-4 py-2 text-sm focus:border-ink focus:outline-none"
          />
        </div>
        <button type="submit" className="btn-primary mt-2">
          ログイン
        </button>
      </form>
    </div>
  );
}
