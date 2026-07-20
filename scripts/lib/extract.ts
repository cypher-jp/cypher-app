// AI(Gemini優先/Anthropicフォールバック)でイベントページの生テキストを構造化JSONへ変換する。
// 実際のAPI呼び出しは ./ai-client に集約されている(プロバイダ切り替え・レート制限対応はそちら)。
import {
  EVENT_TYPES,
  GENRES,
  REGIONS,
  type EventType,
  type Genre,
  type Region,
} from "../../src/types/event";
import { generateText } from "./ai-client";
import type { ExtractedEvent } from "./types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

function normalizeType(value: unknown): EventType {
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if ((EVENT_TYPES as string[]).includes(lower)) return lower as EventType;
  }
  // ETステージはバトル情報が主のため、不明時はbattleに寄せる
  return "battle";
}

function normalizeGenre(value: unknown): Genre {
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if ((GENRES as string[]).includes(lower)) return lower as Genre;
  }
  return "all";
}

function normalizeRegion(value: unknown): Region {
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if ((REGIONS as string[]).includes(lower)) return lower as Region;
  }
  return "other";
}

function extractJsonBlock(text: string): unknown {
  // モデルがコードフェンスや前置き文を付けた場合に備えて最初の{...}ブロックだけ取り出す
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AI応答からJSONブロックを見つけられませんでした");
  }
  return JSON.parse(text.slice(start, end + 1));
}

const SYSTEM_PROMPT = `あなたはストリートダンスのイベント情報サイトのテキストを構造化データへ変換するアシスタントです。
入力されたイベントページのテキストから、以下のJSONスキーマに厳密に従うJSONオブジェクトのみを出力してください。
説明や前置き、コードフェンス(\`\`\`)は一切付けないでください。

スキーマ:
{
  "title": string,               // イベント名
  "type": "${EVENT_TYPES.join('" | "')}",
  "genre": "${GENRES.join('" | "')}",
  "region": "${REGIONS.join('" | "')}",
  "date": "YYYY-MM-DD",           // 開催日(必須。開始日のみ。不明な場合は分かる範囲で最も確からしい日)
  "deadline": "YYYY-MM-DD" | null, // エントリー締切(無ければnull)
  "venue": string,                // 会場名
  "description": string,          // 日本語の説明文(元テキストの要点を保った自然な日本語。300字程度まで)
  "entry_url": string | null,     // 参加エントリーができるURL(無ければnull)
  "ig_handle": string | null,     // 主催者/イベントのInstagramアカウント名(@は付けない。無ければnull)
  "ig_url": string | null         // Instagramの投稿またはプロフィールのURL(無ければnull)
}

都道府県 → region 対応表(主要12都道府県は個別、それ以外は地方ブロックでまとめる):
- hokkaido: 北海道
- miyagi: 宮城
- tohoku: 青森 岩手 秋田 山形 福島 (宮城を除く東北)
- tokyo: 東京
- kanagawa: 神奈川
- chiba: 千葉
- saitama: 埼玉
- kanto: 茨城 栃木 群馬 (東京・神奈川・千葉・埼玉を除く関東)
- niigata: 新潟
- hokuriku: 富山 石川 福井 山梨 長野 (新潟を除く北陸・甲信越)
- aichi: 愛知
- tokai: 岐阜 静岡 三重 (愛知を除く東海)
- kyoto: 京都
- osaka: 大阪
- kansai: 兵庫 奈良 滋賀 和歌山 (京都・大阪を除く関西)
- hiroshima: 広島
- chugoku: 鳥取 島根 岡山 山口 (広島を除く中国)
- shikoku: 徳島 香川 愛媛 高知
- fukuoka: 福岡
- kyushu: 佐賀 長崎 熊本 大分 宮崎 鹿児島 沖縄 (福岡を除く九州・沖縄)
- online: オンライン開催(配信のみで実会場が無い場合)
- other: 上記のいずれにも当てはまらない場合

海外の国・都市 → region 対応表(主要都市は個別、それ以外は国・大陸単位でまとめる):
- seoul: ソウル
- busan: 釜山
- korea: 韓国のそれ以外の都市
- taipei: 台北
- taiwan: 台湾のそれ以外の都市
- shanghai: 上海
- beijing: 北京
- chengdu: 成都
- asia: 上記以外のアジア(中国のそれ以外の都市、東南アジア、香港等すべて含む)
- newyork: ニューヨーク
- losangeles: ロサンゼルス
- us: アメリカのそれ以外の都市

ヨーロッパ → region 対応表(「国＋首都」の2階層。対応国は個別の国キーを優先し、
開催地が首都そのものだと分かる場合のみ首都キーを使う。ロシアもヨーロッパ扱いとする):
- france: フランス(パリ以外)
- paris: フランス・パリ
- germany: ドイツ(ベルリン以外)
- berlin: ドイツ・ベルリン
- netherlands: オランダ(アムステルダム以外)
- amsterdam: オランダ・アムステルダム
- belgium: ベルギー(ブリュッセル以外)
- brussels: ベルギー・ブリュッセル
- uk: イギリス(ロンドン以外)
- london: イギリス・ロンドン
- italy: イタリア(ローマ以外)
- rome: イタリア・ローマ
- spain: スペイン(マドリード以外)
- madrid: スペイン・マドリード
- poland: ポーランド(ワルシャワ以外)
- warsaw: ポーランド・ワルシャワ
- switzerland: スイス(チューリッヒ以外)
- zurich: スイス・チューリッヒ
- russia: ロシア(モスクワ以外)
- moscow: ロシア・モスクワ
- eu: 上記の国リストに無いヨーロッパの国(例: ベルギー・イギリス等を除くその他の国)

分類のルール:
- genre は上記の列挙値の中から最も近いものを選ぶこと。判断できない場合は genre="all" とする。
- region は、まず本文・会場名から開催都道府県(国内)または国・都市(海外)を読み取り、上の対応表に従って変換すること。対応表に無い都道府県名・都市名でも、会場名や市区町村名(例:横浜→神奈川→kanagawa、札幌市→北海道→hokkaido、京都市→京都→kyoto、ブルックリン→ニューヨーク→newyork)から推測できる場合は変換すること。判断できない場合のみ online/other を使う。
- ヨーロッパの国が上の対応表(フランス/ドイツ/オランダ/ベルギー/イギリス/イタリア/スペイン/ポーランド/スイス/ロシア)に含まれる場合は、必ずその国キー(または首都開催なら首都キー)を使うこと。対応表に無いヨーロッパの国(例: スウェーデン、ポルトガル等)は eu を使う。
- 読み取った都道府県名・市区町村名・国名・都市名は description の中に残すこと(ブロックへ丸めた場合でも情報が失われないようにするため)。
- type が不明な場合は "battle" とする。
- date が読み取れない場合でも、必ずISO形式の日付文字列を出力すること(完全に不明な場合のみ null を許容する)。
- ig_handle はテキスト中の「@アカウント名」「instagram.com/アカウント名」等から抽出する。イベント公式または主催者のものを優先し、確信が持てない場合は null とする。`;

/**
 * 生テキスト1件からイベント情報を抽出する。
 * - 日付が無い/不正/過去日の場合は null を返す(呼び出し側でスキップする)
 */
export async function extractEventFromText(
  rawText: string,
  opts: { now?: Date } = {},
): Promise<ExtractedEvent | null> {
  const now = opts.now ?? new Date();

  const text = await generateText({
    system: SYSTEM_PROMPT,
    user: rawText,
    maxTokens: 1024,
    jsonResponse: true,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJsonBlock(text) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `AI応答のJSONパースに失敗しました: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  if (!title) return null;

  if (!isValidIsoDate(parsed.date)) return null;
  const date = parsed.date as string;

  // 過去日イベントはスキップ(当日は許容)
  if (date < todayIso()) return null;

  const deadline = isValidIsoDate(parsed.deadline) ? (parsed.deadline as string) : undefined;

  const venue = typeof parsed.venue === "string" ? parsed.venue.trim() : "";
  const description =
    typeof parsed.description === "string" ? parsed.description.trim() : "";
  const entryUrl =
    typeof parsed.entry_url === "string" && parsed.entry_url.trim()
      ? parsed.entry_url.trim()
      : undefined;

  const igHandle =
    typeof parsed.ig_handle === "string" && parsed.ig_handle.trim()
      ? parsed.ig_handle.trim().replace(/^@/, "")
      : undefined;

  const igUrlRaw =
    typeof parsed.ig_url === "string" && parsed.ig_url.trim()
      ? parsed.ig_url.trim()
      : undefined;
  // instagram.com のURLのみ採用(誤抽出防止)
  const igUrl =
    igUrlRaw && /^https?:\/\/(www\.)?instagram\.com\//.test(igUrlRaw)
      ? igUrlRaw
      : igHandle
        ? `https://www.instagram.com/${igHandle}/`
        : undefined;

  return {
    title,
    type: normalizeType(parsed.type),
    genre: normalizeGenre(parsed.genre),
    region: normalizeRegion(parsed.region),
    date,
    deadline,
    venue,
    description,
    entryUrl,
    igHandle,
    igUrl,
  };
}
