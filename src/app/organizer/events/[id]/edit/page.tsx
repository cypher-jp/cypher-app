import { notFound, redirect } from "next/navigation";
import EventForm from "@/components/admin/EventForm";
import { updateOrganizerEventAction } from "@/app/organizer/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchOrganizerProfile, fetchOwnedEvent } from "@/lib/organizer/data";

interface Props {
  params: { id: string };
  searchParams: { error?: string };
}

export default async function OrganizerEditEventPage({ params, searchParams }: Props) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/organizer/login");
  const profile = await fetchOrganizerProfile(user.id);
  if (!profile || profile.status !== "approved") redirect("/organizer");

  const event = await fetchOwnedEvent(user.id, params.id);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-3xl font-black">イベント編集</h1>
      <p className="mt-2 text-sm text-ink/60">{event.title}</p>

      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {searchParams.error}
        </div>
      )}

      <div className="mt-6">
        <EventForm
          action={updateOrganizerEventAction.bind(null, event.id)}
          defaultValues={{
            title: event.title,
            type: event.type,
            genre: event.genre,
            genres: event.genres ?? [event.genre],
            region: event.region,
            date: event.date,
            endDate: event.endDate ?? "",
            deadline: event.deadline ?? "",
            venue: event.venue,
            description: event.description,
            igPostUrl: event.igPostUrl ?? "",
            igHandle: event.igHandle ?? "",
            entryUrl: event.entryUrl ?? "",
            flyerUrl: event.flyerUrl ?? "",
            galleryUrls: event.galleryUrls ?? [],
            descriptionI18n: event.descriptionI18n,
            timeInfo: event.timeInfo ?? "",
            format: event.format ?? "",
            entryFee: event.entryFee ?? "",
            audienceFee: event.audienceFee ?? "",
            entrySlots: event.entrySlots ?? "",
            entryMethod: event.entryMethod ?? "",
            judges: event.judges ?? "",
            djs: event.djs ?? "",
            mc: event.mc ?? "",
            prize: event.prize ?? "",
            organizer: event.organizer ?? "",
            acceptEntries: event.acceptEntries,
            entryCapacity: event.entryCapacity,
            entryCategories: event.entryCategories ?? [],
          }}
          submitLabel="保存する"
          organizerMode
        />
      </div>
    </div>
  );
}
