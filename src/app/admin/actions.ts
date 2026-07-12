"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extractIgHandle } from "@/lib/ig";
import {
  insertEvent,
  updateEvent,
  updateEventStatus,
  uploadFlyer,
  type EventInput,
} from "@/lib/admin/events";
import type { EventStatus } from "@/types/event";
import { routing } from "@/i18n/routing";

function revalidatePublicPaths(eventId?: string) {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/calendar`);
    if (eventId) revalidatePath(`/${locale}/events/${eventId}`);
  }
}

export async function signInAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/admin/login?error=${encodeURIComponent("メールアドレスとパスワードを入力してください")}`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin");
}

export async function signOutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function approveEventAction(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  await updateEventStatus(supabase, id, "published");
  revalidatePublicPaths(id);
  revalidatePath("/admin");
}

export async function rejectEventAction(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  await updateEventStatus(supabase, id, "draft");
  revalidatePublicPaths(id);
  revalidatePath("/admin");
}

interface ParsedForm {
  title: string;
  type: string;
  genre: string;
  region: string;
  date: string;
  deadline: string | null;
  venue: string;
  description: string;
  igPostUrl: string | null;
  igHandle: string | null;
  entryUrl: string | null;
  status: EventStatus;
  source: string | null;
  flyerFile: File | null;
}

function parseEventForm(formData: FormData): ParsedForm {
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "battle");
  const genre = String(formData.get("genre") ?? "all");
  const region = String(formData.get("region") ?? "other");
  const date = String(formData.get("date") ?? "").trim();
  const deadlineRaw = String(formData.get("deadline") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const igPostUrlRaw = String(formData.get("igPostUrl") ?? "").trim();
  const igHandleRaw = String(formData.get("igHandle") ?? "").trim();
  const entryUrlRaw = String(formData.get("entryUrl") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "pending");
  const status: EventStatus =
    statusRaw === "published" || statusRaw === "draft" ? statusRaw : "pending";
  const sourceRaw = String(formData.get("source") ?? "").trim();

  const igHandle = igHandleRaw || extractIgHandle(igPostUrlRaw) || null;

  const flyerEntry = formData.get("flyer");
  const flyerFile =
    flyerEntry instanceof File && flyerEntry.size > 0 ? flyerEntry : null;

  return {
    title,
    type,
    genre,
    region,
    date,
    deadline: deadlineRaw || null,
    venue,
    description,
    igPostUrl: igPostUrlRaw || null,
    igHandle,
    entryUrl: entryUrlRaw || null,
    status,
    source: sourceRaw || null,
    flyerFile,
  };
}

export async function createEventAction(formData: FormData): Promise<void> {
  const parsed = parseEventForm(formData);

  if (!parsed.title || !parsed.date) {
    redirect(
      `/admin/new?error=${encodeURIComponent("タイトルと開催日は必須です")}`,
    );
  }

  const supabase = createSupabaseServerClient();

  let flyerUrl: string | null = null;
  if (parsed.flyerFile) {
    try {
      flyerUrl = await uploadFlyer(supabase, parsed.flyerFile);
    } catch (e) {
      const message = e instanceof Error ? e.message : "アップロードに失敗しました";
      redirect(`/admin/new?error=${encodeURIComponent(message)}`);
    }
  }

  const input: EventInput = {
    title: parsed.title,
    type: parsed.type,
    genre: parsed.genre,
    region: parsed.region,
    date: parsed.date,
    deadline: parsed.deadline,
    venue: parsed.venue,
    description: parsed.description,
    flyerUrl,
    igHandle: parsed.igHandle,
    igPostUrl: parsed.igPostUrl,
    entryUrl: parsed.entryUrl,
    status: parsed.status,
    source: parsed.source ?? "manual",
  };

  const result = await insertEvent(supabase, input);
  if (!result) {
    redirect(`/admin/new?error=${encodeURIComponent("登録に失敗しました")}`);
  }

  revalidatePublicPaths(result.id);
  revalidatePath("/admin");
  redirect(`/admin?tab=${input.status}`);
}

export async function updateEventAction(
  id: string,
  formData: FormData,
): Promise<void> {
  const parsed = parseEventForm(formData);

  if (!parsed.title || !parsed.date) {
    redirect(
      `/admin/events/${id}/edit?error=${encodeURIComponent("タイトルと開催日は必須です")}`,
    );
  }

  const supabase = createSupabaseServerClient();

  const existingFlyerUrl = String(formData.get("existingFlyerUrl") ?? "").trim();
  let flyerUrl: string | null = existingFlyerUrl || null;

  if (parsed.flyerFile) {
    try {
      flyerUrl = await uploadFlyer(supabase, parsed.flyerFile);
    } catch (e) {
      const message = e instanceof Error ? e.message : "アップロードに失敗しました";
      redirect(`/admin/events/${id}/edit?error=${encodeURIComponent(message)}`);
    }
  }

  const input: EventInput = {
    title: parsed.title,
    type: parsed.type,
    genre: parsed.genre,
    region: parsed.region,
    date: parsed.date,
    deadline: parsed.deadline,
    venue: parsed.venue,
    description: parsed.description,
    flyerUrl,
    igHandle: parsed.igHandle,
    igPostUrl: parsed.igPostUrl,
    entryUrl: parsed.entryUrl,
    status: parsed.status,
    source: parsed.source,
  };

  const ok = await updateEvent(supabase, id, input);
  if (!ok) {
    redirect(`/admin/events/${id}/edit?error=${encodeURIComponent("更新に失敗しました")}`);
  }

  revalidatePublicPaths(id);
  revalidatePath("/admin");
  revalidatePath(`/admin/events/${id}/edit`);
  redirect(`/admin?tab=${input.status}`);
}
