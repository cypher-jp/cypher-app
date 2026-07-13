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
  "entry_url": string | null      // 参加エントリーができるURL(無ければnull)
}

分類のルール:
- genre/region は上記の列挙値の中から最も近いものを選ぶこと。判断できない場合は genre="all", region="other" とする。
- type が不明な場合は "battle" とする。
- date が読み取れない場合でも、必ずISO形式の日付文字列を出力すること(完全に不明な場合のみ null を許容する)。`;

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
  };
}
