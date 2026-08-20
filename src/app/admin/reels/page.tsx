import Link from "next/link";
import ReelEventPicker from "@/components/admin/ReelEventPicker";
import ShareReelButton from "@/components/admin/ShareReelButton";
import SubmitButton from "@/components/admin/SubmitButton";
import { REEL_MAX_EVENTS, fetchReelCandidates, fetchReelJobs, type ReelJob } from "@/lib/admin/reels";
import { createReelJobAction, deleteReelJobAction, requeueReelJobAction } from "./actions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { message?: string; error?: string };
}

const STATUS_LABEL: Record<ReelJob["status"], { text: string; cls: string }> = {
  queued: { text: "待機中", cls: "bg-ink/10 text-ink" },
  rendering: { text: "生成中", cls: "bg-cypher-yellow text-ink" },
  done: { text: "完成", cls: "bg-cypher-green text-paper" },
  failed: { text: "失敗", cls: "bg-cypher-red text-paper" },
};

function fmt(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false });
}

export default async function AdminReelsPage({ searchParams }: Props) {
  const [candidates, jobs] = await Promise.all([fetchReelCandidates(), fetchReelJobs()]);
  const dispatchConfigured = Boolean(process.env.GITHUB_DISPATCH_TOKEN);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display text-3xl font-black">REELS</h1>
          <p className="mt-1 text-sm text-ink/60">
            新着イベントをまとめた Instagram Reels(1080×1920・約15秒)を自動生成します。
          </p>
        </div>
        <Link href="/admin" className="btn-ghost text-sm">
          ← イベント管理へ
        </Link>
      </div>

      {searchParams.message && (
        <div className="mt-4 rounded-xl border border-cypher-green/40 bg-cypher-green/10 px-4 py-3 text-sm">
          {searchParams.message}
        </div>
      )}
      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-cypher-red/40 bg-cypher-red/10 px-4 py-3 text-sm">
          {searchParams.error}
        </div>
      )}
      {!dispatchConfigured && (
        <div className="mt-4 rounded-xl border border-ink/15 bg-white px-4 py-3 text-xs text-ink/70">
          即時起動(GITHUB_DISPATCH_TOKEN)が未設定のため、生成は30分おきの定期実行で処理されます。
        </div>
      )}

      <form action={createReelJobAction} className="mt-8 space-y-6">
        <section>
          <h2 className="display text-xl font-black">1. 載せるイベントを選ぶ(最大{REEL_MAX_EVENTS}件)</h2>
          <div className="mt-3">
            <ReelEventPicker events={candidates} maxSelect={REEL_MAX_EVENTS} />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">見出し(任意)</span>
            <input
              name="headline"
              className="input mt-1"
              placeholder="NEW EVENTS / BREAKING EVENTS など"
              maxLength={40}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">サブ見出し(任意)</span>
            <input name="subline" className="input mt-1" placeholder="自動: THIS WEEK · AUG 19 – 25" maxLength={60} />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">1イベントあたりの秒数</span>
            <select name="seconds" className="input mt-1" defaultValue="2.5">
              <option value="2">2秒(テンポ速め)</option>
              <option value="2.5">2.5秒(標準)</option>
              <option value="3">3秒</option>
              <option value="3.5">3.5秒</option>
              <option value="4">4秒(じっくり)</option>
            </select>
          </label>
        </section>

        <div className="flex items-center gap-3">
          <SubmitButton label="Generate Reel" pendingLabel="登録中..." />
          <span className="text-xs text-ink/60">
            完成まで2〜4分。完成したら下の一覧からダウンロードして Instagram に投稿してください。
          </span>
        </div>
      </form>

      <section className="mt-12">
        <h2 className="display text-xl font-black">生成履歴</h2>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">まだ生成履歴はありません。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {jobs.map((job) => {
              const st = STATUS_LABEL[job.status];
              const rendered = (job.params?.rendered ?? null) as { events?: number; subline?: string } | null;
              return (
                <li key={job.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4">
                  {job.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={job.thumbnailUrl} alt="" className="h-24 w-[54px] rounded object-cover" />
                  ) : (
                    <div className="h-24 w-[54px] rounded bg-ink/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`chip ${st.cls}`}>{st.text}</span>
                      <span className="font-bold">{job.eventIds.length} イベント</span>
                      {rendered?.subline && <span className="text-ink/60">{rendered.subline}</span>}
                      {job.durationSeconds && <span className="text-ink/60">{job.durationSeconds.toFixed(1)}秒</span>}
                    </div>
                    <div className="mt-1 text-xs text-ink/60">
                      作成 {fmt(job.createdAt)}
                      {job.finishedAt ? ` ・ 完了 ${fmt(job.finishedAt)}` : ""}
                      {job.createdBy ? ` ・ ${job.createdBy}` : ""}
                    </div>
                    {job.error && <div className="mt-1 break-all text-xs text-cypher-red">{job.error}</div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.videoUrl && (
                      <>
                        <a href={job.videoUrl} target="_blank" rel="noopener" className="btn-ghost text-xs">
                          再生
                        </a>
                        <a href={job.videoUrl} download className="btn-ghost text-xs" title="PCはこちら">
                          DL
                        </a>
                        <ShareReelButton videoUrl={job.videoUrl} />
                      </>
                    )}
                    {(job.status === "failed" || job.status === "done") && (
                      <form action={requeueReelJobAction}>
                        <input type="hidden" name="id" value={job.id} />
                        <button type="submit" className="btn-ghost text-xs">
                          再生成
                        </button>
                      </form>
                    )}
                    <form action={deleteReelJobAction}>
                      <input type="hidden" name="id" value={job.id} />
                      <button type="submit" className="btn-ghost text-xs text-cypher-red">
                        削除
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
