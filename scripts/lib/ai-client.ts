// extract.ts(構造化抽出) と translate.ts(4言語翻訳) が共有する AI プロバイダ切り替え層。
//
// - GEMINI_API_KEY が設定されていれば Gemini API(無料枠)を使う
// - 無ければ Anthropic API を使う(従来どおりのフォールバック)
//
// Gemini無料枠のレート制限(Flash-Lite: 15RPM等)に配慮し、
// - 呼び出し間隔にグローバルな最小インターバルを設ける(extract/translate 横断で共有。
//   1イベントにつき「抽出→翻訳」と連続で呼ぶため、このモジュール単位で状態を持つ)
// - 429(レート超過)は指数バックオフで最大3回リトライする
//
// 【重要】APIキー(の一部)は絶対にログ・エラーメッセージに出力しないこと。
import Anthropic from "@anthropic-ai/sdk";

export type AiProvider = "gemini" | "anthropic";

const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
// Make.comのシナリオ(モジュール4)で運用実績のあるモデルをデフォルトにする
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_GEMINI_MIN_INTERVAL_MS = 5000;
const MAX_RETRIES = 3;

/** 使用するプロバイダを環境変数から判定する(GEMINI_API_KEY優先、無ければAnthropic) */
export function getProvider(): AiProvider {
  return process.env.GEMINI_API_KEY?.trim() ? "gemini" : "anthropic";
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

function getMinIntervalMs(): number {
  const raw = Number(process.env.GEMINI_MIN_INTERVAL_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_GEMINI_MIN_INTERVAL_MS;
}

let loggedProvider = false;
/** 実行ログの冒頭(初回API呼び出し時)にプロバイダとモデル名を1度だけ出力する */
function logProviderOnce(): void {
  if (loggedProvider) return;
  loggedProvider = true;
  const provider = getProvider();
  const model = provider === "gemini" ? getGeminiModel() : getAnthropicModel();
  console.log(`[AI] provider=${provider} model=${model}`);
}

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY が設定されていません。GEMINI_API_KEY を設定するか、GitHub Secrets / ローカルのexport を確認してください。",
    );
  }
  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

/** Gemini呼び出し間の直近時刻(モジュールスコープ = extract.ts / translate.ts 横断で共有される) */
let lastGeminiCallAt = 0;

/** 前回のGemini呼び出しから最低GEMINI_MIN_INTERVAL_MSが経過するまで待つ */
async function throttleGemini(): Promise<void> {
  const minInterval = getMinIntervalMs();
  if (minInterval <= 0) return;
  const wait = lastGeminiCallAt + minInterval - Date.now();
  if (wait > 0) {
    await sleep(wait);
  }
  lastGeminiCallAt = Date.now();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class RateLimitError extends Error {
  readonly status = 429;
}

export interface GenerateParams {
  /** システムプロンプト(役割・指示・出力スキーマ等) */
  system: string;
  /** ユーザー入力本文 */
  user: string;
  /** 最大出力トークン数 */
  maxTokens: number;
  /** trueの場合、Gemini呼び出し時にJSON出力を強制する(generationConfig.responseMimeType) */
  jsonResponse?: boolean;
}

interface GeminiPart {
  text?: string;
}

async function callGeminiOnce(params: GenerateParams): Promise<string> {
  const model = getGeminiModel();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません。");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    systemInstruction: {
      role: "system",
      parts: [{ text: params.system }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: params.user }],
      },
    ],
    generationConfig: {
      maxOutputTokens: params.maxTokens,
      ...(params.jsonResponse ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new RateLimitError("Gemini API レート制限(429)に達しました");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const errJson = (await res.json()) as { error?: { message?: string } };
      detail = errJson?.error?.message ?? "";
    } catch {
      // レスポンスボディが無い/JSONでない場合は無視
    }
    throw new Error(
      `Gemini API呼び出しに失敗しました(status=${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: GeminiPart[] } }[];
  };
  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "";
  if (!text) {
    throw new Error("Gemini応答にtextが含まれていませんでした");
  }
  return text;
}

async function callAnthropicOnce(params: GenerateParams): Promise<string> {
  const anthropic = getAnthropicClient();
  const message = await anthropic.messages.create({
    model: getAnthropicModel(),
    max_tokens: params.maxTokens,
    system: params.system,
    messages: [{ role: "user", content: params.user }],
  });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  if (!textBlock) {
    throw new Error("Claudeの応答にtextブロックがありませんでした");
  }
  return textBlock.text;
}

function isRateLimitError(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (status === 429) return true;
  }
  if (err instanceof Error && /\b429\b/.test(err.message)) return true;
  return false;
}

/**
 * プロバイダを自動判定してテキスト生成する(extract.ts / translate.ts の共通入口)。
 * - GEMINI_API_KEY があれば Gemini(レート制限スロットリング + 429指数バックオフリトライ付き)
 * - 無ければ Anthropic(従来どおり、リトライ/スロットリングなし)
 *
 * 呼び出し元は戻り値のテキストから自力でJSONブロックを取り出してパースすること
 * (Geminiはjson mode、Anthropicはプロンプト指示のみで従来の抽出ロジックを流用するため)。
 */
export async function generateText(params: GenerateParams): Promise<string> {
  logProviderOnce();
  const provider = getProvider();

  if (provider === "anthropic") {
    return callAnthropicOnce(params);
  }

  let attempt = 0;
  for (;;) {
    await throttleGemini();
    try {
      return await callGeminiOnce(params);
    } catch (err) {
      if (isRateLimitError(err) && attempt < MAX_RETRIES) {
        attempt++;
        const backoffMs = 1000 * 2 ** attempt; // 2s, 4s, 8s
        console.warn(
          `[AI] Gemini 429(レート超過)。${backoffMs}ms待って再試行します (${attempt}/${MAX_RETRIES})`,
        );
        await sleep(backoffMs);
        continue;
      }
      throw err;
    }
  }
}
