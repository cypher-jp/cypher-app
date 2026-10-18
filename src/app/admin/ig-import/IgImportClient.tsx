"use client";

import { useEffect, useMemo, useState } from "react";
import { importInstagramFromUrlsAction, type IgImportPayload, type IgImportResult } from "./actions";

/**
 * PC用ブックマークレットの本体。Instagramの投稿ページで実行すると
 *   1. 投稿URL・本文(h1)を取る
 *   2. カルーセルの「次へ」を押し切って、全スライドの画像URL(最大解像度)を集める
 *   3. このサイトの /admin/ig-import を新しいタブで開き、URLのハッシュにJSONを載せて渡す
 * Instagram側のCSPでfetchは封じられているので、ページ遷移でデータを渡す方式にしている。
 * 新しいタブはクリック直後(await前)に開いておき、後からURLを差し替える(ポップアップブロック対策)。
 */
function buildBookmarklet(origin: string): string {
  const src = `(async()=>{try{
var m=location.pathname.match(/\\/(p|reel|reels|tv)\\/([A-Za-z0-9_-]+)/);
if(!m){alert('Instagramの投稿ページを開いた状態で押してください');return;}
var w=window.open('about:blank','_blank');
var url='https://www.instagram.com/'+(m[1]==='reels'?'reel':m[1])+'/'+m[2]+'/';
var art=document.querySelector('article')||document;
var seen=[];
var pick=function(){var imgs=art.querySelectorAll('img');for(var i=0;i<imgs.length;i++){var el=imgs[i];var s=el.currentSrc||el.src||'';if(!/t51\\.[0-9]+-15\\//.test(s))continue;var best=s;if(el.srcset){var c=el.srcset.split(',').map(function(x){var p=x.trim().split(/\\s+/);return [p[0],parseInt(p[1])||0];}).sort(function(a,b){return b[1]-a[1];});if(c[0])best=c[0][0];}var key=best.split('?')[0];if(!seen.some(function(e){return e.k===key;}))seen.push({k:key,u:best});}};
pick();
for(var n=0;n<15;n++){var nb=art.querySelector('button[aria-label="Next"],button[aria-label="次へ"]');if(!nb)break;nb.click();await new Promise(function(r){setTimeout(r,450);});pick();}
var h1=art.querySelector('h1');var cap=h1?h1.innerText:'';
if(!cap){var og=document.querySelector('meta[property="og:title"]');cap=og?og.content:'';}
var data={url:url,caption:cap,images:seen.slice(0,8).map(function(e){return e.u;})};
if(!data.images.length){w.close();alert('画像が見つかりませんでした');return;}
w.location.href='${origin}/admin/ig-import#'+encodeURIComponent(JSON.stringify(data));
}catch(e){alert('エラー: '+e.message);}})();`;
  return "javascript:" + encodeURIComponent(src.replace(/\n/g, ""));
}

function parseHash(): IgImportPayload | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.slice(1);
  if (!raw) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(raw)) as Partial<IgImportPayload>;
    if (!obj || typeof obj.url !== "string" || !Array.isArray(obj.images)) return null;
    return { url: obj.url, caption: String(obj.caption ?? ""), images: obj.images.map(String) };
  } catch {
    return null;
  }
}

type Phase = "idle" | "running" | "done" | "error";

export default function IgImportClient() {
  const [payload, setPayload] = useState<IgImportPayload | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<IgImportResult | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const p = parseHash();
    if (p) {
      setPayload(p);
      // 取り込みは自動で開始(ブックマークを押す→この画面が開く→終わるまで待つだけ)
      setPhase("running");
      importInstagramFromUrlsAction(p)
        .then((r) => {
          setResult(r);
          setPhase(r.ok ? "done" : "error");
        })
        .catch((e: unknown) => {
          setResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
          setPhase("error");
        });
    }
  }, []);

  const bookmarklet = useMemo(() => (origin ? buildBookmarklet(origin) : ""), [origin]);

  function retry() {
    if (!payload) return;
    setPhase("running");
    setResult(null);
    importInstagramFromUrlsAction(payload).then((r) => {
      setResult(r);
      setPhase(r.ok ? "done" : "error");
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {payload && (
        <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="display text-xl font-black">取り込み</h2>
            {phase === "running" && (
              <span className="rounded-full bg-cypher-yellow/35 px-3 py-1 text-xs font-extrabold text-ink/70">
                AIが読み取り中…(10〜30秒)
              </span>
            )}
            {phase === "done" && (
              <span className="rounded-full bg-cypher-green/10 px-3 py-1 text-xs font-extrabold text-cypher-green">
                完了
              </span>
            )}
            {phase === "error" && (
              <span className="rounded-full bg-cypher-red/10 px-3 py-1 text-xs font-extrabold text-cypher-red">
                失敗
              </span>
            )}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto">
            {payload.images.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={u}
                src={u}
                alt={i === 0 ? "フライヤー" : `ギャラリー ${i}`}
                className={`h-28 w-auto shrink-0 rounded-lg border object-cover ${
                  i === 0 ? "border-cypher-red" : "border-ink/10"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink/45">
            {payload.images.length}枚(赤枠=フライヤー、残りはギャラリー)・{" "}
            <a href={payload.url} target="_blank" rel="noopener" className="underline">
              投稿を開く
            </a>
          </p>
          {payload.caption && (
            <p className="mt-3 max-h-24 overflow-y-auto whitespace-pre-wrap rounded-xl bg-ink/5 px-4 py-3 text-xs text-ink/70">
              {payload.caption}
            </p>
          )}

          {result && result.ok && (
            <div className="mt-5 rounded-2xl border-2 border-cypher-green bg-white p-4">
              <p className="display text-lg font-black">{result.title || "(無題)"}</p>
              <p className="mt-1 text-sm text-ink/60">
                {result.merged ? "既存のイベントに画像・情報を追加しました" : "承認待ちとして登録しました"}
                ・画像 {result.images} 枚
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`/admin/events/${result.id}/edit`} className="btn-primary text-sm">
                  内容を確認・公開する
                </a>
                <a href="/admin" className="btn-ghost text-sm">
                  管理画面へ
                </a>
              </div>
            </div>
          )}
          {result && !result.ok && (
            <div className="mt-5 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
              {result.error}
              <div className="mt-2">
                <button type="button" onClick={retry} className="btn-ghost text-xs">
                  もう一度
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-card">
        <h2 className="display text-xl font-black">PCから1クリックで取り込む</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          下のボタンをブラウザのブックマークバーへ<b>ドラッグ&amp;ドロップ</b>してください(1回だけ)。
          あとはPCでInstagramの投稿を開いて、そのブックマークを押すだけ。写真は全枚・最大解像度で自動取得、
          本文も一緒に読み取って承認待ちに登録します。同じ投稿を2回押しても二重登録にはなりません。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {bookmarklet && (
            <span
              // Reactはjavascript:リンクを警告するので、生のHTMLとして差し込む
              dangerouslySetInnerHTML={{
                __html: `<a href="${bookmarklet}" class="inline-block rounded-full bg-cypher-red px-6 py-3 text-sm font-extrabold text-white shadow-card" onclick="alert('クリックではなく、ブックマークバーへドラッグしてください');return false;">📌 WORLD Cypherに取り込む</a>`,
              }}
            />
          )}
          <span className="text-xs text-ink/45">← これをブックマークバーへドラッグ</span>
        </div>
        <ol className="mt-5 list-decimal space-y-1 pl-5 text-sm text-ink/70">
          <li>Chromeでブックマークバーを表示(⌘+Shift+B)</li>
          <li>上の赤いボタンをバーへドラッグ</li>
          <li>instagram.com で投稿を開く → ブックマークを押す → この画面が開いて自動で取り込み</li>
        </ol>
        <p className="mt-3 text-[11px] text-ink/45">
          動画投稿は対象外(写真のみ)。Instagramの画面が変わって動かなくなったら教えてください。
        </p>
      </section>
    </div>
  );
}
