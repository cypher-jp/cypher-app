// Claude API でイベントページの生テキストを構造化JSONへ変換する。
import Anthropic from "@anthropic-ai/sdk";
import {
  EVENT_TYPES,
  GENRES,
  REGIONS,
  type EventType,
  type Genre,
  type Region,
} from "../../src/types/event";
import type { ExtractedEvent } from "./types";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

function getModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY が設定されていません。GitHub Secrets / ローカルのexport を確認してください。",
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}

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
    throw new Error("Claudeの応答からJSONブロックを見つけられませんでした");
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

都道府県 → 地方ブロック(region) 対応表:
- hokkaido: 北海道
- tohoku: 青森 岩手 宮城 秋田 山形 福島
- kanto: 東京 神奈川 千葉 埼玉 茨城 栃木 群馬
- hokuriku: 新潟 富山 石川 福井 山梨 長野
- tokai: 愛知 岐阜 静岡 三重
- kansai: 大阪 京都 兵庫 奈良 滋賀 和歌山
- chugoku: 鳥取 島根 岡山 広島 山口
- shikoku: 徳島 香川 愛媛 高知
- kyushu: 福岡 佐賀 長崎 熊本 大分 宮崎 鹿児島 沖縄
- online: オンライン開催(配信のみで実会場が無い場合)
- korea/taiwan/asia/us/eu: 海外開催(該当地域)
- other: 上記のいずれにも当てはまらない場合

分類のルール:
- genre は上記の列挙値の中から最も近いものを選ぶこと。判断できない場合は genre="all" とする。
- region は、まず本文・会場名から開催都道府県を読み取り、上の対応表で地方ブロックへ変換すること。都道府県名が直接書かれていなくても、会場名や市区町村名(例:横浜→神奈川→kanto、札幌市→北海道→hokkaido)から推測できる場合は変換すること。海外/オンライン/判断不能の場合のみ online/korea/taiwan/asia/us/eu/other を使う。
- 読み取った都道府県名や市区町村名は description の中に残すこと(地方ブロックへの変換で情報が失われないようにするため)。
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
  const anthropic = getClient();
  const now = opts.now ?? new Date();

  const message = await anthropic.messages.create({
    model: getModel(),
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: rawText }],
  });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  if (!textBlock) {
    throw new Error("Claudeの応答にtextブロックがありませんでした");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJsonBlock(textBlock.text) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `Claude応答のJSONパースに失敗しました: ${
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
