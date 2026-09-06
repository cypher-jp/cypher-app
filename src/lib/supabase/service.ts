import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * service role クライアント(サーバー専用・RLSをバイパスする)。
 * 主催者ポータルと公開エントリーフォームのDB操作に使う。
 * RLSが効かないため、必ず呼び出し側で認可チェック
 * (ログイン確認・承認済み主催者か・イベントの所有者か)を行ってから使うこと。
 * クライアントコンポーネントから絶対にimportしない。
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。Vercelの環境変数を確認してください。",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
