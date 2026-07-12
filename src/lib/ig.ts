/**
 * Instagram投稿URL(例: https://www.instagram.com/world_cypher/p/ABC123/ )から
 * アカウントハンドルを抽出する。
 * 通常の投稿パーマリンク(https://www.instagram.com/p/ABC123/)にはハンドルが
 * 含まれないため、その場合は undefined を返す(手動入力してもらう)。
 */
export function extractIgHandle(url: string): string | undefined {
  if (!url) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if (!parsed.hostname.toLowerCase().includes("instagram.com")) {
    return undefined;
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return undefined;

  const reserved = new Set([
    "p",
    "reel",
    "reels",
    "tv",
    "stories",
    "explore",
    "accounts",
    "direct",
  ]);

  const first = parts[0];
  if (reserved.has(first.toLowerCase())) return undefined;

  return first;
}
