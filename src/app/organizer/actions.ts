"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { insertEvent, updateEvent, uploadFlyer, type EventInput } from "@/lib/admin/events";
import { parseEventForm, detailFields, entrySettingsFields } from "@/lib/eventForm";
import { fetchOrganizerProfile, fetchOwnedEvent } from "@/lib/organizer/data";
import { promoteFromWaitlist } from "@/lib/entries";
import { routing } from "@/i18n/routing";

function revalidatePublicPaths(eventId?: string) {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/calendar`);
    if (eventId) revalidatePath(`/${locale}/events/${eventId}`);
  }
}

/** ログイン済み+承認済み主催者であることを確認し、userIdを返す。だめなら適切な画面へ飛ばす */
async function requireApprovedOrganizer(): Promise<string> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/organizer/login");
  const profile = await fetchOrganizerProfile(user.id);
  if (!profile) redirect("/organizer/apply");
  if (profile.status !== "approved") redirect("/organizer");
  return user.id;
}

export async function organizerSignInAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    redirect(`/organizer/login?error=${encodeURIComponent("メールアドレスとパスワードを入力してください")}`);
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/organizer/login?error=${encodeURIComponent("ログインに失敗しました。メールアドレスとパスワードを確認してください")}`);
  }
  redirect("/organizer");
}

export async function organizerSignOutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/organizer/login");
}

/**
 * 主催者登録の申請。
 * 未ログインなら新規アカウント作成(signUp)→ organizersに申請行を作成(status=pending)。
 * ログイン済み(申請行が無いだけ)なら申請行の作成のみ行う。
 */
export async function applyOrganizerAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const igHandle = String(formData.get("igHandle") ?? "").trim().replace(/^@/, "").slice(0, 100);
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) {
    redirect(`/organizer/apply?error=${encodeURIComponent("主催者名(チーム/団体名)を入力してください")}`);
  }

  const supabase = createSupabaseServerClient();
  let userId: string | null = null;
  let userEmail = email;

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (currentUser) {
    userId = currentUser.id;
    userEmail = currentUser.email ?? email;
  } else {
    if (!email || password.length < 8) {
      redirect(`/organizer/apply?error=${encodeURIComponent("メールアドレスと8文字以上のパスワードを入力してください")}`);
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      redirect(`/organizer/apply?error=${encodeURIComponent(`アカウント作成に失敗しました: ${error?.message ?? ""}`)}`);
    }
    userId = data.user.id;
  }

  // 申請行の作成はservice roleで行う(メール確認が有効な環境でもセッション無しで登録できるように)
  const service = createServiceClient();
  const { error: insError } = await service.from("organizers").insert({
    id: userId,
    name,
    ig_handle: igHandle || null,
    contact_email: userEmail,
    message: message || null,
    status: "pending",
  });
  if (insError && insError.code !== "23505") {
    redirect(`/organizer/apply?error=${encodeURIComponent(`申請の登録に失敗しました: ${insError.message}`)}`);
  }
  redirect("/organizer");
}

/** 主催者によるイベント新規登録(必ずstatus=pendingで作成し、公開はオーナー承認) */
export async function createOrganizerEventAction(formData: FormData): Promise<void> {
  const userId = await requireApprovedOrganizer();
  const parsed = parseEventForm(formData);
  if (!parsed.title || !parsed.date) {
    redirect(`/organizer/events/new?error=${encodeURIComponent("タイトルと開催日は必須です")}`);
  }

  const service = createServiceClient();
  let flyerUrl: string | null = null;
  if (parsed.flyerFile) {
    try {
      flyerUrl = await uploadFlyer(service, parsed.flyerFile);
    } catch (e) {
      const message = e instanceof Error ? e.message : "アップロードに失敗しました";
      redirect(`/organizer/events/new?error=${encodeURIComponent(message)}`);
    }
  }
  const galleryUrls: string[] = [];
  for (const file of parsed.galleryFiles) {
    try {
      galleryUrls.push(await uploadFlyer(service, file));
    } catch {
      // 追加画像の失敗は本体の登録を止めない
    }
  }

  const input: EventInput = {
    title: parsed.title,
    type: parsed.type,
    genre: parsed.genre,
    genres: parsed.genres,
    region: parsed.region,
    date: parsed.date,
    endDate: parsed.endDate,
    deadline: parsed.deadline,
    venue: parsed.venue,
    description: parsed.description,
    flyerUrl,
    galleryUrls: galleryUrls.length > 0 ? galleryUrls : undefined,
    igHandle: parsed.igHandle,
    igPostUrl: parsed.igPostUrl,
    entryUrl: parsed.entryUrl,
    status: "pending",
    source: "organizer",
    ...detailFields(parsed),
    ...entrySettingsFields(parsed),
    organizerId: userId,
  };

  const result = await insertEvent(service, input);
  if (!result) {
    redirect(`/organizer/events/new?error=${encodeURIComponent("登録に失敗しました")}`);
  }
  revalidatePath("/organizer");
  redirect(`/organizer?message=${encodeURIComponent("登録しました。運営の承認後にサイトへ公開されます")}`);
}

/**
 * 主催者によるイベント編集。
 * 公開済みイベントは公開のまま内容が更新される(承認済み主催者を信頼する運用)。
 * ステータス・出典は主催者からは変更できない。
 */
export async function updateOrganizerEventAction(
  id: string,
  formData: FormData,
): Promise<void> {
  const userId = await requireApprovedOrganizer();
  const existing = await fetchOwnedEvent(userId, id);
  if (!existing) redirect("/organizer");

  const parsed = parseEventForm(formData);
  if (!parsed.title || !parsed.date) {
    redirect(`/organizer/events/${id}/edit?error=${encodeURIComponent("タイトルと開催日は必須です")}`);
  }

  const service = createServiceClient();
  const existingFlyerUrl = String(formData.get("existingFlyerUrl") ?? "").trim();
  let flyerUrl: string | null = existingFlyerUrl || null;
  if (parsed.flyerFile) {
    try {
      flyerUrl = await uploadFlyer(service, parsed.flyerFile);
    } catch (e) {
      const message = e instanceof Error ? e.message : "アップロードに失敗しました";
      redirect(`/organizer/events/${id}/edit?error=${encodeURIComponent(message)}`);
    }
  }
  // ギャラリー: 「残す」チェックの付いた既存URL + 新規アップロード
  const keptGallery = formData
    .getAll("keepGallery")
    .map((v) => String(v))
    .filter((v) => v.startsWith("http"));
  const galleryUrls = [...keptGallery];
  for (const file of parsed.galleryFiles) {
    try {
      galleryUrls.push(await uploadFlyer(service, file));
    } catch {
      // 追加画像の失敗は保存を止めない
    }
  }

  const input: EventInput = {
    title: parsed.title,
    type: parsed.type,
    genre: parsed.genre,
    genres: parsed.genres,
    region: parsed.region,
    date: parsed.date,
    endDate: parsed.endDate,
    deadline: parsed.deadline,
    venue: parsed.venue,
    description: parsed.description,
    flyerUrl,
    galleryUrls,
    igHandle: parsed.igHandle,
    igPostUrl: parsed.igPostUrl,
    entryUrl: parsed.entryUrl,
    status: existing.status ?? "pending",
    source: existing.source ?? "organizer",
    ...detailFields(parsed),
    ...entrySettingsFields(parsed),
  };

  const ok = await updateEvent(service, id, input);
  if (!ok) {
    redirect(`/organizer/events/${id}/edit?error=${encodeURIComponent("保存に失敗しました")}`);
  }
  // 定員を増やした場合はキャンセル待ちを自動繰り上げ
  await promoteFromWaitlist(service, id);
  revalidatePublicPaths(id);
  revalidatePath("/organizer");
  redirect(`/organizer?message=${encodeURIComponent("保存しました")}`);
}

/** エントリーのステータス変更(主催者用: キャンセル/繰り上げ/チェックイン) */
export async function setEntryStatusAction(
  entryId: string,
  status: "entered" | "cancelled" | "checked_in",
  formData: FormData,
): Promise<void> {
  void formData;
  const userId = await requireApprovedOrganizer();
  const service = createServiceClient();
  const { data: entry } = await service
    .from("entries")
    .select("id,event_id,status")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry) redirect("/organizer");
  const eventId = String(entry.event_id);
  const owned = await fetchOwnedEvent(userId, eventId);
  if (!owned) redirect("/organizer");

  await service
    .from("entries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", entryId);
  // キャンセルで枠が空いたら自動繰り上げ
  if (status === "cancelled") {
    await promoteFromWaitlist(service, eventId);
  }
  revalidatePath(`/organizer/events/${eventId}/entries`);
  redirect(`/organizer/events/${eventId}/entries`);
}
