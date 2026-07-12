import { notFound } from "next/navigation";
import EventForm from "@/components/admin/EventForm";
import { updateEventAction } from "@/app/admin/actions";
import { fetchAdminEventById } from "@/lib/admin/events";

interface Props {
  params: { id: string };
  searchParams: { error?: string };
}

export default async function AdminEditEventPage({ params, searchParams }: Props) {
  const event = await fetchAdminEventById(params.id);
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
          action={updateEventAction.bind(null, event.id)}
          defaultValues={{
            title: event.title,
            type: event.type,
            genre: event.genre,
            region: event.region,
            date: event.date,
            deadline: event.deadline ?? "",
            venue: event.venue,
            description: event.description,
            igPostUrl: event.igPostUrl ?? "",
            igHandle: event.igHandle ?? "",
            entryUrl: event.entryUrl ?? "",
            status: event.status ?? "pending",
            source: event.source ?? "",
            flyerUrl: event.flyerUrl ?? "",
          }}
          submitLabel="保存する"
        />
      </div>
    </div>
  );
}
