// Claude API で説明文(日本語)を en/ko/zh/fr へ一括翻訳する。
import Anthropic from "@anthropic-ai/sdk";
import { I18N_LOCALES, type I18nLocale } from "../../src/types/event";
import type { TranslationMap } from "./types";

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

function extractJsonBlock(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Claudeの応答からJSONブロックを見つけられませんでした");
  }
  return JSON.parse(text.slice(start, end + 1));
}

const LOCALE_NAME: Record<I18nLocale, string> = {
  en: "English",
  ko: "한국어(Korean)",
  zh: "简体中文(Simplified Chinese)",
  fr: "Français(French)",
};

function buildSystemPrompt(): string {
  const schema = I18N_LOCALES.map((l) => `  "${l}": string`).join(",\n");
  return `あなたはストリートダンスのイベント情報サイトの翻訳者です。
日本語のイベント説明文を、以下の4言語に自然に翻訳し、次のJSONスキーマに厳密に従うJSONオブジェクトのみを出力してください。
説明や前置き、コードフェンス(\`\`\`)は一切付けないでください。

言語: ${I18N_LOCALES.map((l) => `${l}=${LOCALE_NAME[l]}`).join(", ")}

スキーマ:
{
${schema}
}

ルール:
- 固有名詞(イベント名・会場名・ダンスジャンル名等)は無理に訳さず、原語表記を活かしてよい。
- 元の文体・改行は保ちつつ、各言語として自然な文章にすること。
- 入力が極端に短い/情報が無い場合でも、必ず4言語すべてのキーを出力すること。`;
}

/**
 * 日本語の説明文を1回のAPIコールで en/ko/zh/fr へ翻訳する。
 * 空文字を渡した場合は空のオブジェクトを返す(API呼び出しはしない)。
 */
export async function translateDescription(
  description: string,
): Promise<TranslationMap> {
  const trimmed = description.trim();
  if (!trimmed) return {};

  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: getModel(),
    max_tokens: 2048,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: trimmed }],
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
      `翻訳結果のJSONパースに失敗しました: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const result: TranslationMap = {};
  for (const locale of I18N_LOCALES) {
    const value = parsed[locale];
    if (typeof value === "string" && value.trim()) {
      result[locale] = value.trim();
    }
  }
  return result;
}
