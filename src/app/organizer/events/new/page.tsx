import { redirect } from "next/navigation";
import EventForm from "@/components/admin/EventForm";
import { createOrganizerEventAction } from "@/app/organizer/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchOrganizerProfile } from "@/lib/organizer/data";

interface Props {
  searchParams: { error?: string };
}

export default async function OrganizerNewEventPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/organizer/login");
  const profile = await fetchOrganizerProfile(user.id);
  if (!profile || profile.status !== "approved") redirect("/organizer");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-3xl font-black">イベント登録</h1>
      <p className="mt-2 text-sm text-ink/60">
        登録内容は運営の承認後にサイトへ公開されます。
        「このサイトでエントリーを受け付ける」をONにすると、公開後のイベントページにエントリーフォームが付きます。
      </p>

      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {searchParams.error}
        </div>
      )}

      <div className="mt-6">
        <EventForm
          action={createOrganizerEventAction}
          defaultValues={{ organizer: profile.name, igHandle: profile.igHandle ?? "" }}
          submitLabel="登録する(承認後に公開)"
          organizerMode
        />
      </div>
    </div>
  );
}
