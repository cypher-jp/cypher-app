import IgImportClient from "./IgImportClient";

/**
 * Instagram投稿のPC取り込み画面。
 * ブックマークレットがこのURLのハッシュに {url, caption, images[]} を載せて開く。
 * 取り込み本体はサーバーアクション(actions.ts)で、管理者ログインが必須。
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export default function IgImportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <span className="text-xs font-extrabold tracking-[0.25em] text-cypher-red">INSTAGRAM</span>
      <h1 className="display mt-1 text-3xl font-black">IG投稿の取り込み</h1>
      <p className="mt-2 text-sm text-ink/60">
        iPhoneのショートカットと同じ処理を、PCのブラウザから1クリックで。
      </p>
      <div className="mt-8">
        <IgImportClient />
      </div>
    </div>
  );
}
