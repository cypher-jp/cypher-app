import Link from "next/link";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminEventsBoard from "@/components/admin/AdminEventsBoard";
import PendingEventsBoard from "@/components/admin/PendingEventsBoard";
import { fetchAdminEvents, fetchAdminEventCounts } from "@/lib/admin/events";
import { buildDedupeKey, groupPendingEvents } from "@/lib/admin/dedupe";
import { ADMIN_GENRE_LABEL } from "@/lib/admin/labels";
import { GENRES, type EventStatus, type Genre } from "@/types/event";

interface Props {
  searchParams: { tab?: string; genre?: string; q?: string; noimg?: string; message?: string };
}

export default async function AdminHomePage({ searchParams }: Props) {
  const tab: EventStatus =
    searchParams.tab === "published" || searchParams.tab === "draft"
      ? searchParams.tab
      : "pending";

  // ジャンル絞り込み(全タブ共通)。不正な値は無視して全件表示。
  const genre: Genre | undefined = GENRES.includes(searchParams.genre as Genre)
    ? (searchParams.genre as Genre)
    : undefined;

  // フリーワード検索(タイトル/会場/主催/説明)。空なら絞り込みなし。
  const q = (searchParams.q ?? "").trim().slice(0, 100);
  // 画像(フライヤー)未設定のイベントだけに絞る(まとめて画像を入れたい時用)
  const noimg = searchParams.noimg === "1";

  const [events, counts] = await Promise.all([
    fetchAdminEvents(tab, genre, { q, noFlyer: noimg }),
    fetchAdminEventCounts(),
  ]);

  // 承認待ちタブのみ、同一イベントらしき行をまとめて表示する
  // (公開中/却下タブは個別管理のままでよいため対象外)。
  const pendingGroups = tab === "pending" ? groupPendingEvents(events) : [];

  // 「既に公開済みの同じイベント」検知用。承認すると公開ページに2枚並んでしまうため、
  // 承認待ちカードに警告を出してオーナーが却下を判断できるようにする
  // (例: インスタ手動登録で公開済み + 後からスクレイパーが同イベントを別URLで拾ったケース)。
  const publishedKeys: string[] =
    tab === "pending"
      ? (await fetchAdminEvents("published")).map((e) => buildDedupeKey(e))
      : [];
  const duplicateGroupCount = pendingGroups.filter(
    (g) => g.others.length > 0,
  ).length;

  return (
    <div>
      {searchParams.message && (
        <div className="mb-4 rounded-xl border border-cypher-green/40 bg-cypher-green/10 px-4 py-3 text-sm font-bold">
          ✓ {searchParams.message}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-3xl font-black">EVENTS</h1>
        <div className="flex gap-2">
          <Link href="/admin/reels" className="btn-ghost text-sm">
            Reels
          </Link>
          <Link href="/admin/articles" className="btn-ghost text-sm">
            記事管理
          </Link>
          <Link href="/admin/contacts" className="btn-ghost text-sm">
            お問い合わせ
          </Link>
          <Link href="/admin/new" className="btn-primary text-sm">
            + 新規登録
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <AdminTabs current={tab} counts={counts} />
      </div>

      {/* フリーワード検索(タブ・ジャンルは維持) */}
      <form action="/admin" method="get" className="mt-4 flex gap-2">
        <input type="hidden" name="tab" value={tab} />
        {genre && <input type="hidden" name="genre" value={genre} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="タイトル・会場・主催で検索"
          className="input max-w-md"
        />
        <button type="submit" className="btn-ghost text-sm">
          検索
        </button>
        {q && (
          <Link
            href={`/admin?tab=${tab}${genre ? `&genre=${genre}` : ""}`}
            className="btn-ghost text-sm"
          >
            クリア
          </Link>
        )}
      </form>

      {/* ジャンル絞り込みチップ(公開中タブ含む全タブで有効) */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Link
          href={`/admin?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}${noimg ? "&noimg=1" : ""}`}
          className={genre === undefined ? "chip bg-ink text-paper" : "chip-outline"}
        >
          全ジャンル
        </Link>
        {GENRES.map((g) => (
          <Link
            key={g}
            href={`/admin?tab=${tab}&genre=${g}${q ? `&q=${encodeURIComponent(q)}` : ""}${noimg ? "&noimg=1" : ""}`}
            className={genre === g ? "chip bg-ink text-paper" : "chip-outline"}
          >
            {ADMIN_GENRE_LABEL[g]}
          </Link>
        ))}
        <Link
          href={`/admin?tab=${tab}${genre ? `&genre=${genre}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}${noimg ? "" : "&noimg=1"}`}
          className={noimg ? "chip bg-cypher-red text-paper" : "chip-outline"}
        >
          画像なしのみ
        </Link>
      </div>

      {tab === "pending" && duplicateGroupCount > 0 && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          同じイベントらしき重複が {duplicateGroupCount}
          組見つかったため、1枚のカードにまとめて表示しています。
        </div>
      )}

      <div className="mt-6">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 p-12 text-center text-ink/60">
            {q ? `「${q}」に一致するイベントはありません。` : "該当するイベントはありません。"}
            {tab === "published" && !q && (
              <p className="mt-2 text-xs text-ink/40">
                ※ 終了したイベントは公開中タブには表示されません
              </p>
            )}
          </div>
        ) : tab === "pending" ? (
          <PendingEventsBoard groups={pendingGroups} publishedKeys={publishedKeys} />
        ) : (
          <AdminEventsBoard events={events} />
        )}
      </div>
    </div>
  );
}
