"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  REEL_MAX_EVENTS,
  deleteReelJob,
  insertReelJob,
  requeueReelJob,
  triggerReelRender,
} from "@/lib/admin/reels";

function back(message: string, isError = false): never {
  const key = isError ? "error" : "message";
  redirect(`/admin/reels?${key}=${encodeURIComponent(message)}`);
}

/** 管理画面「Generate Reel」: 選択イベントでジョブを作成し、GitHub Actions を起動する */
export async function createReelJobAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const ids = formData
    .getAll("event_ids")
    .map((v) => String(v))
    .filter((v) => /^[0-9a-f-]{36}$/i.test(v));
  if (ids.length === 0) back("イベントを1件以上選択してください", true);
  if (ids.length > REEL_MAX_EVENTS) back(`選択できるのは最大${REEL_MAX_EVENTS}件です`, true);

  const headline = String(formData.get("headline") ?? "").trim().slice(0, 40);
  const subline = String(formData.get("subline") ?? "").trim().slice(0, 60);
  // 1イベントあたりの表示秒数(2〜4秒の範囲に丸める)
  const secondsRaw = Number(formData.get("seconds"));
  const seconds = Number.isFinite(secondsRaw) ? Math.min(4, Math.max(2, secondsRaw)) : 2.5;
  // デザインテンプレート(classic=黒ベース / light=白ベース)
  const templateRaw = String(formData.get("template") ?? "");
  const template = templateRaw === "light" ? "light" : "classic";

  const created = await insertReelJob({
    eventIds: ids,
    headline: headline || undefined,
    subline: subline || undefined,
    secondsPerEvent: seconds,
    template,
    createdBy: user.email ?? null,
  });
  if ("error" in created) back(`ジョブ作成に失敗しました: ${created.error}`, true);

  const trig = await triggerReelRender(created.id);
  revalidatePath("/admin/reels");
  if (trig.dispatched) {
    back("生成を開始しました。2〜4分ほどで完成します(このページを再読み込みしてください)");
  }
  if (trig.error) {
    back(`ジョブは登録しましたが即時起動に失敗しました(${trig.error})。30分以内の定期実行で処理されます`);
  }
  back("ジョブを登録しました。即時起動の設定(GITHUB_DISPATCH_TOKEN)が無いため、30分以内の定期実行で処理されます");
}

export async function requeueReelJobAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) back("不正なIDです", true);
  const err = await requeueReelJob(id);
  if (err) back(`再実行に失敗しました: ${err}`, true);
  const trig = await triggerReelRender(id);
  revalidatePath("/admin/reels");
  back(trig.dispatched ? "再実行を開始しました" : "再実行をキューに入れました(定期実行で処理されます)");
}

export async function deleteReelJobAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) back("不正なIDです", true);
  const err = await deleteReelJob(id);
  if (err) back(`削除に失敗しました: ${err}`, true);
  revalidatePath("/admin/reels");
  back("削除しました");
}
