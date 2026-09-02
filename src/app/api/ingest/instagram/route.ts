import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Instagram投稿 → イベント取り込みの受け口(Make「Integration Webhooks」シナリオの置き換え)。
 *
 * iPhoneのショートカットから multipart/form-data でPOSTされる:
 *   note        … 投稿本文(キャプション)
 *   写真 / photo … フライヤー画像(ファイル)。**複数枚可**: 1枚目=フライヤー、2枚目以降=ギャラリー(gallery_urls)
 *   ig_post_url … 投稿URL(任意。あればファイル名にショートコードを使う)
 * 認証: ヘッダー x-ingest-key(または ?key=) が INGEST_SECRET と一致すること。
 *
 * 処理: Geminiでフライヤー+本文から構造化抽出 → Storage(flyers)へ画像保存 → events に pending で登録。
 * 環境変数: GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, INGEST_SECRET, (GEMINI_MODEL)
 */
// deploy: 2026-08-19 env vars applied
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const PROMPT_INTRO = "この画像はダンスイベントの告知フライヤーです。関連するInstagram投稿の本文も渡すので、画像とテキスト両方を参考にして次のJSON形式で情報を抽出してください。読み取れない項目は必ずnullにし、推測で埋めないでください。日付の年が書かれていない場合は、投稿日(本日)から見て直近の未来になる年を採用し、過去の日付にはしないでください。JSON以外の文字は出力しないでください。";
const PROMPT_SCHEMA = "{\"title\":\"イベント名(正式名称。vol.や年号を含める)\",\"type\":\"battle/contest/showcase/workshop/audition/festival のいずれか\",\"genre\":\"all/breaking/hiphop/house/locking/popping/waacking/krump/jazz/freestyle のいずれか(複数ジャンルなら主要な1つ、オールスタイルならall)\",\"date\":\"開催初日 YYYY-MM-DD\",\"end_date\":\"複数日開催なら最終日 YYYY-MM-DD、単日ならnull\",\"deadline\":\"エントリー締切 YYYY-MM-DDまたはnull\",\"time_info\":\"開場・開始・終了時刻(例: OPEN 12:00 / START 13:00)。無ければnull\",\"venue\":\"会場名(住所があれば「会場名, 市区町村」)\",\"region\":\"会場の場所から次のいずれか: hokkaido/miyagi/tohoku/tokyo/kanagawa/chiba/saitama/ibaraki/kanto/niigata/hokuriku/aichi/tokai/kyoto/osaka/kansai/hiroshima/chugoku/shikoku/fukuoka/kyushu/okinawa/online/seoul/busan/korea/taipei/taiwan/shanghai/beijing/chengdu/hongkong/china/thailand/vietnam/malaysia/singapore/philippines/indonesia/india/asia/newyork/losangeles/us/canada/mexico/southamerica/france/paris/germany/berlin/netherlands/amsterdam/belgium/brussels/uk/london/italy/rome/spain/madrid/portugal/poland/warsaw/switzerland/zurich/austria/czechia/hungary/greece/finland/russia/moscow/eu/middleeast/africa/australia/other。日本は都道府県キー(例:大阪府ならosaka)を最優先、無ければ地方ブロック。ヨーロッパは首都開催なら首都キー(paris/berlin等)、それ以外は国キー(france/germany等)、リストに無い国はeu。アジアは都市キー優先、無ければ国キー(korea/taiwan/vietnam等)かasia\",\"format\":\"バトル形式(例: 1on1, 2on2, 3on3, 5on5, crew, cypher, 7toSmoke, showcase, kids 1on1)。無ければnull\",\"entry_fee\":\"エントリー費(例: ¥2,000 / 事前¥1,500 当日¥2,000 / 無料)。無ければnull\",\"audience_fee\":\"観覧料(例: ¥1,000 / 無料)。無ければnull\",\"entry_slots\":\"エントリー枠数(例: 32 / 先着64組)。無ければnull\",\"entry_method\":\"エントリー方法 url/dm/form/onsite/other のいずれか。読み取れなければnull\",\"entry_url\":\"エントリー用URL(本文にhttpから始まるURLがある場合のみ。『リンクはプロフィールから』等はnull)\",\"judges\":\"ジャッジ名をカンマ区切り(例: DUKE, MASA, YU-KI)。無ければnull\",\"djs\":\"DJ名をカンマ区切り。無ければnull\",\"mc\":\"MC名。無ければnull\",\"prize\":\"賞金・賞品(例: 優勝¥100,000 / 本戦シード権)。無ければnull\",\"organizer\":\"主催者名・団体名。無ければnull\",\"ig_handle\":\"主催者のInstagramアカウント名(@は除く)。投稿本文の@メンションや画像から読み取れなければnull\",\"description\":\"日本語で内容の要約150〜200字。ジャンル・形式・見どころ・対象(キッズ/U-25等)を含める。読み取れない情報は書かない\",\"description_en\":\"descriptionの自然な英訳\",\"description_ko\":\"descriptionの自然な韓国語訳\",\"description_zh\":\"descriptionの自然な中国語(簡体字)訳\",\"description_fr\":\"descriptionの自然なフランス語訳\"}";
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const FLYERS_BUCKET = "flyers";
/** 1回の取り込みで受け付ける最大画像数(1枚目=フライヤー、以降=ギャラリー) */
const MAX_IMAGES = 8;

type Extracted = Record<string, unknown>;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // --- 認証 ---
  const secret = process.env.INGEST_SECRET;
  const provided = req.headers.get("x-ingest-key") ?? req.nextUrl.searchParams.get("key");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!geminiKey || !supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "server not configured (GEMINI_API_KEY / SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 },
    );
  }

  // --- 入力(multipart) ---
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "multipart/form-data expected" }, { status: 400 });
  }
  const note = str(form.get("note") ?? form.get("caption") ?? form.get("text"));
  const igPostUrl = str(form.get("ig_post_url") ?? form.get("url") ?? form.get("post_url"));
  // 複数枚対応: 同じフィールド名の繰り返し(ショートカットでリストを渡した場合)も全て拾う
  const fileEntries: Blob[] = [];
  for (const key of ["写真", "photo", "image", "file", "flyer"]) {
    for (const v of form.getAll(key)) {
      if (v instanceof Blob && v.size > 0) fileEntries.push(v);
    }
  }
  if (fileEntries.length === 0) {
    return NextResponse.json({ ok: false, error: "image file (写真/photo) is required" }, { status: 400 });
  }
  const images = await Promise.all(
    fileEntries.slice(0, MAX_IMAGES).map(async (f) => ({
      buf: Buffer.from(await f.arrayBuffer()),
      mime: f.type && f.type.startsWith("image/") ? f.type : "image/jpeg",
    })),
  );

  // --- Geminiで抽出(最大3枚まで見せる。複数枚フライヤーの続きページから詳細を拾えるように) ---
  let extracted: Extracted;
  try {
    extracted = await extractWithGemini(geminiKey, images.slice(0, 3), note);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, stage: "gemini", error: message }, { status: 502 });
  }

  // --- 画像をStorageへ(同じ投稿=同じファイル名で上書き)。1枚目=フライヤー、2枚目以降=ギャラリー ---
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const baseName = buildBaseName(igPostUrl);
  const uploadedUrls: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const filename = i === 0 ? `${baseName}.jpg` : `${baseName}_${i + 1}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(FLYERS_BUCKET)
      .upload(filename, images[i].buf, { contentType: images[i].mime, upsert: true });
    if (upErr) {
      return NextResponse.json({ ok: false, stage: "storage", error: upErr.message }, { status: 502 });
    }
    uploadedUrls.push(supabase.storage.from(FLYERS_BUCKET).getPublicUrl(filename).data.publicUrl);
  }
  const flyerUrl = uploadedUrls[0];
  const galleryUrls = uploadedUrls.slice(1);

  // --- DB登録(pending)。同じIG投稿の既存行があれば下でマージに切り替える ---
  const row = {
    title: text(extracted.title) ?? "(無題)",
    type: pick(extracted.type, ["battle", "contest", "showcase", "workshop", "audition", "festival"], "battle"),
    genre: pick(
      extracted.genre,
      ["all", "breaking", "hiphop", "house", "locking", "popping", "waacking", "krump", "jazz", "freestyle"],
      "all",
    ),
    date: dateOrToday(extracted.date),
    end_date: dateOrNull(extracted.end_date),
    deadline: dateOrNull(extracted.deadline),
    venue: text(extracted.venue) ?? "",
    region: text(extracted.region) ?? "other",
    description: text(extracted.description) ?? "",
    description_i18n: {
      en: text(extracted.description_en),
      ko: text(extracted.description_ko),
      zh: text(extracted.description_zh),
      fr: text(extracted.description_fr),
    },
    time_info: text(extracted.time_info),
    format: text(extracted.format),
    entry_fee: text(extracted.entry_fee),
    audience_fee: text(extracted.audience_fee),
    entry_slots: text(extracted.entry_slots),
    entry_method: pick(extracted.entry_method, ["url", "dm", "form", "onsite", "other"], null),
    entry_url: urlOrNull(extracted.entry_url),
    judges: text(extracted.judges),
    djs: text(extracted.djs),
    mc: text(extracted.mc),
    prize: text(extracted.prize),
    organizer: text(extracted.organizer),
    ig_handle: text(extracted.ig_handle)?.replace(/^@/, "") ?? null,
    ig_post_url: igPostUrl || null,
    flyer_url: flyerUrl,
    ...(galleryUrls.length > 0 ? { gallery_urls: galleryUrls } : {}),
    status: "pending",
    source: "instagram",
  };

  // --- 同じIG投稿の再送信はマージ(重複イベントを作らない) ---
  // 送り直し(サイズ超過で一部失敗した後など)や画像の追加送信でイベントが二重にならないよう、
  // 投稿ショートコードが一致する既存行があれば「画像の追加 + 空欄の補完」だけを行う。
  const shortcode = igPostUrl.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
  if (shortcode) {
    const { data: existing } = await supabase
      .from("events")
      .select("*")
      .like("ig_post_url", `%/${shortcode}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      const ex = existing as Record<string, unknown>;
      const patch: Record<string, unknown> = {};
      // 画像: フライヤーが無ければ1枚目を充て、残りをギャラリーへ(URL重複は除外)
      const exFlyer = ex.flyer_url ? String(ex.flyer_url) : null;
      const exGallery = Array.isArray(ex.gallery_urls) ? (ex.gallery_urls as string[]) : [];
      const incoming = [...uploadedUrls];
      const newFlyer = exFlyer ?? incoming.shift() ?? null;
      if (!exFlyer && newFlyer) patch.flyer_url = newFlyer;
      const mergedGallery = [...exGallery];
      for (const u of incoming) {
        if (u !== newFlyer && !mergedGallery.includes(u)) mergedGallery.push(u);
      }
      if (mergedGallery.length !== exGallery.length) patch.gallery_urls = mergedGallery;
      // 空欄の項目だけ今回の抽出結果で補完(管理画面で手直しした値は守る)
      for (const [k, v] of Object.entries(row)) {
        if (["status", "source", "flyer_url", "gallery_urls", "ig_post_url"].includes(k)) continue;
        if (v == null || v === "") continue;
        if (ex[k] == null || ex[k] === "") patch[k] = v;
      }
      // 一度draft(非表示)にした投稿をもう一度共有した場合は、承認待ちに戻す
      if (ex.status === "draft") patch.status = "pending";
      if (Object.keys(patch).length > 0) {
        const { error: upError } = await supabase.from("events").update(patch).eq("id", String(ex.id));
        if (upError) {
          return NextResponse.json({ ok: false, stage: "db", error: upError.message }, { status: 502 });
        }
      }
      return NextResponse.json({
        ok: true,
        id: ex.id,
        title: String(ex.title ?? ""),
        merged: true,
        images: uploadedUrls.length,
      });
    }
  }

  const { data, error: insErr } = await supabase.from("events").insert(row).select("id,title").single();
  if (insErr || !data) {
    return NextResponse.json(
      { ok: false, stage: "db", error: insErr?.message ?? "insert failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, id: data.id, title: data.title, images: uploadedUrls.length });
}

// ---------- helpers ----------

async function extractWithGemini(
  apiKey: string,
  images: { buf: Buffer; mime: string }[],
  note: string,
): Promise<Extracted> {
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const cleanNote = note.replace(/[\r\n]+/g, " ").trim();
  const prompt = `${PROMPT_INTRO}\n\n【投稿本文】\n${cleanNote}\n\n${PROMPT_SCHEMA}`;
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          ...images.map((img) => ({
            inline_data: { mime_type: img.mime, data: img.buf.toString("base64") },
          })),
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${json.error?.message ?? "request failed"}`);
  }
  const textOut = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const jsonText = textOut.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as Extracted;
  } catch {
    throw new Error(`Gemini returned non-JSON: ${textOut.slice(0, 200)}`);
  }
}

// IG投稿URLからショートコードを取り出してファイル名の元にする。取れなければ時刻+乱数。
function buildBaseName(igPostUrl: string): string {
  const m = igPostUrl.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${ts}-${Math.floor(Math.random() * 100000)}`;
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}
function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[\r\n]+/g, " ").trim();
  return s && s.toLowerCase() !== "null" ? s : null;
}
function pick<T extends string>(v: unknown, allowed: T[], fallback: T | null): T | null {
  const s = text(v)?.toLowerCase();
  return s && (allowed as string[]).includes(s) ? (s as T) : fallback;
}
function dateOrNull(v: unknown): string | null {
  const s = text(v);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
function dateOrToday(v: unknown): string {
  return dateOrNull(v) ?? new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function urlOrNull(v: unknown): string | null {
  const s = text(v);
  return s && /^https?:\/\//i.test(s) ? s : null;
}
