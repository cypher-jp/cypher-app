import EventForm from "@/components/admin/EventForm";
import { createEventAction } from "@/app/admin/actions";

interface Props {
  searchParams: { error?: string };
}

export default function AdminNewEventPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-3xl font-black">新規登録</h1>
      <p className="mt-2 text-sm text-ink/60">
        IG共有取り込みの受け皿。必須項目はタイトル・種別・開催日・エリアのみ。
      </p>

      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {searchParams.error}
        </div>
      )}

      <div className="mt-6">
        <EventForm
          action={createEventAction}
          defaultValues={{ status: "published", source: "manual" }}
          submitLabel="登録する"
        />
      </div>
    </div>
  );
}
