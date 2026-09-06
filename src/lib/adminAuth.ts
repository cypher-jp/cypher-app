/**
 * 管理者(オーナー)判定。
 * DB側のRLSも同じ判定(public.is_admin()関数)を持っており、両方で二重に守る。
 * オーナーのメールアドレスを変更する場合はDB関数側も更新すること。
 */
export const ADMIN_EMAIL = "maryasdwww@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}
