// AI(Gemini優先/Anthropicフォールバック)で説明文(日本語)を en/ko/zh/fr へ一括翻訳する。
// 実際のAPI呼び出しは ./ai-client に集約されている(プロバイダ切り替え・レート制限対応はそちら)。
import { I18N_LOCALES, type I18nLocale } from "../../src/types/event";
import { generateText } from "./ai-client";
import type { TranslationMap } from "./types";

function extractJsonBlock(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AI応答からJSONブロックを見つけられませんでした");
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

  const text = await generateText({
    system: buildSystemPrompt(),
    user: trimmed,
    maxTokens: 2048,
    jsonResponse: true,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJsonBlock(text) as Record<string, unknown>;
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
