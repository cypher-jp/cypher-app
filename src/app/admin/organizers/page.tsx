import { fetchOrganizers } from "@/lib/organizer/data";
import { setOrganizerStatusAction } from "@/app/admin/actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "承認待ち",
  approved: "承認済み",
  rejected: "却下",
};

/** 主催者アカウントの申請一覧・承認/却下(オーナー用) */
export default async function AdminOrganizersPage() {
  const organizers = await fetchOrganizers();
  const pending = organizers.filter((o) => o.status === "pending");
  const others = organizers.filter((o) => o.status !== "pending");

  return (
    <div>
      <h1 className="display text-3xl font-black">主催者アカウント</h1>
      <p className="mt-2 text-sm text-ink/60">
        承認すると、その主催者はイベントの掲載申請(公開はあなたの承認制)とエントリーリスト管理ができるようになります。
      </p>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-widest text-ink/60">
        承認待ち({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p className="mt-2 text-sm text-ink/40">承認待ちの申請はありません。</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {pending.map((o) => (
            <div
              key={o.id}
              className="rounded-2xl border border-ink/10 bg-white/60 px-5 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{o.name}</p>
                  <p className="mt-0.5 text-xs text-ink/60">
                    {o.contactEmail}
                    {o.igHandle && (
                      <>
                        {" ・ "}
                        <a
                          href={`https://instagram.com/${o.igHandle}`}
                          target="_blank"
                          rel="noopener"
                          className="underline"
                        >
                          @{o.igHandle}
                        </a>
                      </>
                    )}
                    {" ・ "}
                    {o.createdAt.slice(0, 10)}
                  </p>
                  {o.message && (
                    <p className="mt-2 whitespace-pre-line rounded-lg bg-ink/5 px-3 py-2 text-xs text-ink/70">
                      {o.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <form action={setOrganizerStatusAction.bind(null, o.id, "approved")}>
                    <button type="submit" className="btn-primary text-xs">
                      承認する
                    </button>
                  </form>
                  <form action={setOrganizerStatusAction.bind(null, o.id, "rejected")}>
                    <button type="submit" className="btn-ghost text-xs text-cypher-red">
                      却下
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-10 text-sm font-bold uppercase tracking-widest text-ink/60">
        すべての主催者({others.length})
      </h2>
      {others.length === 0 ? (
        <p className="mt-2 text-sm text-ink/40">まだ主催者はいません。</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink/50">
                <th className="px-2 py-2">主催者名</th>
                <th className="px-2 py-2">メール</th>
                <th className="px-2 py-2">IG</th>
                <th className="px-2 py-2">状態</th>
                <th className="px-2 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {others.map((o) => (
                <tr key={o.id} className="border-b border-ink/5">
                  <td className="px-2 py-2 font-bold">{o.name}</td>
                  <td className="px-2 py-2">{o.contactEmail}</td>
                  <td className="px-2 py-2">{o.igHandle ? `@${o.igHandle}` : "-"}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        o.status === "approved"
                          ? "bg-green-600/10 text-green-700"
                          : "bg-ink/10 text-ink/60"
                      }`}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    {o.status === "approved" ? (
                      <form action={setOrganizerStatusAction.bind(null, o.id, "rejected")}>
                        <button type="submit" className="btn-ghost px-2 py-1 text-[11px] text-cypher-red">
                          停止
                        </button>
                      </form>
                    ) : (
                      <form action={setOrganizerStatusAction.bind(null, o.id, "approved")}>
                        <button type="submit" className="btn-ghost px-2 py-1 text-[11px]">
                          承認する
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
