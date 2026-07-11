// サイト全体で使う公開URL。Vercelの環境変数 NEXT_PUBLIC_SITE_URL を優先し、
// 未設定時は現状の公開URL（worldcypher.vercel.app）にフォールバックする。
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://worldcypher.vercel.app";

export const SITE_NAME = "WORLD Cypher.";
