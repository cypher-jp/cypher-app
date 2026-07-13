// スクレイパー用の礼儀正しいHTTPフェッチャー。
// - User-Agentを明記する
// - リクエスト間隔を必ず空ける(既定2秒)
// - 5xx/ネットワークエラーはリトライする
// - robots.txt を簡易パースして許可判定する

export const USER_AGENT = "WorldCypherBot/1.0 (+https://worldcypher.vercel.app)";

/** リクエスト間隔の最小値(ミリ秒)。docs/IMPLEMENTATION_PLAN.md Phase3の「2秒以上」を満たす */
export const MIN_REQUEST_INTERVAL_MS = 2000;

let lastRequestAt = 0;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** モジュール内で直近のリクエストからMIN_REQUEST_INTERVAL_MS以上空くまで待つ */
async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestAt = Date.now();
}

export interface PoliteFetchOptions {
  retries?: number; // 失敗時の再試行回数(初回リクエストを含まない)
  retryDelayMs?: number;
  headers?: Record<string, string>;
}

/**
 * レート制限・UA明記・リトライ付きのfetch。
 * 429/5xx やネットワークエラーの場合のみリトライする(4xxは即失敗)。
 */
export async function politeFetch(
  url: string,
  options: PoliteFetchOptions = {},
): Promise<Response> {
  const retries = options.retries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 3000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    await waitForRateLimit();
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          ...options.headers,
        },
      });

      if (res.ok) return res;

      // 4xx(429を除く)はリトライしても解決しないため即座に返す
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return res;
      }

      lastError = new Error(`HTTP ${res.status} for ${url}`);
    } catch (err) {
      lastError = err;
    }

    if (attempt < retries) {
      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`fetch failed for ${url}`);
}

export async function fetchText(url: string): Promise<string> {
  const res = await politeFetch(url);
  if (!res.ok) {
    throw new Error(`fetchText failed: HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

export interface RobotsCheckResult {
  allowed: boolean;
  /** 判定理由(ログ・コード内コメント用) */
  reason: string;
}

/**
 * 簡易robots.txtパーサー。
 * User-agent: <ua名> または User-agent: * のグループ内の Disallow/Allow のみサポートする
 * (Sitemap/Crawl-delay等の他ディレクティブは無視)。
 * robots.txt が存在しない(404等)場合は「明示的な禁止規定なし」として allowed:true を返す。
 */
export async function checkRobotsTxt(
  origin: string,
  path: string,
  userAgent: string = USER_AGENT,
): Promise<RobotsCheckResult> {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  let body: string;
  let status: number;

  try {
    const res = await politeFetch(robotsUrl, { retries: 1 });
    status = res.status;
    body = res.ok ? await res.text() : "";
  } catch (err) {
    return {
      allowed: true,
      reason: `robots.txt取得失敗(ネットワークエラー: ${
        err instanceof Error ? err.message : String(err)
      })。明示的な禁止が確認できないため許可扱いとする`,
    };
  }

  if (status === 404) {
    return {
      allowed: true,
      reason: "robots.txt が存在しない(404)。明示的な禁止規定なしとして許可扱いとする",
    };
  }
  if (!body.trim()) {
    return {
      allowed: true,
      reason: "robots.txt が空。明示的な禁止規定なしとして許可扱いとする",
    };
  }

  const uaLower = userAgent.toLowerCase();
  const botName = uaLower.split("/")[0]; // 例: "worldcypherbot"

  type Group = { agents: string[]; disallow: string[]; allow: string[] };
  const groups: Group[] = [];
  let current: Group | null = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      // 直前のグループがすでにディレクティブを持っていたら新グループ開始
      if (current && (current.disallow.length > 0 || current.allow.length > 0)) {
        current = null;
      }
      if (!current) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "disallow" && current) {
      if (value) current.disallow.push(value);
    } else if (key === "allow" && current) {
      if (value) current.allow.push(value);
    }
  }

  const matching = groups.filter(
    (g) =>
      g.agents.includes("*") ||
      g.agents.some((a) => a.includes(botName) || botName.includes(a)),
  );

  // 完全一致(botName)グループがあればそちらを優先
  const specific = matching.filter((g) => !g.agents.includes("*"));
  const applicable = specific.length > 0 ? specific : matching;

  if (applicable.length === 0) {
    return {
      allowed: true,
      reason: "robots.txt に該当User-agentグループなし。許可扱いとする",
    };
  }

  for (const group of applicable) {
    const disallowed = group.disallow.some((rule) => path.startsWith(rule));
    const allowed = group.allow.some((rule) => path.startsWith(rule));
    if (disallowed && !allowed) {
      return {
        allowed: false,
        reason: `robots.txt が ${path} を拒否している(Disallow: ${group.disallow.join(", ")})`,
      };
    }
  }

  return { allowed: true, reason: "robots.txt のDisallowに一致しなかった" };
}
