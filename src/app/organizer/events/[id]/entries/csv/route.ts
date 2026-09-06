import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchOrganizerProfile, fetchOwnedEvent, fetchEventEntries } from "@/lib/organizer/data";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  entered: "確定",
  waitlisted: "キャンセル待ち",
  cancelled: "キャンセル",
  checked_in: "受付済み",
};

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

/** エントリーリストのCSVダウンロード(主催者本人のみ)。Excel対応のためBOM付きUTF-8 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await fetchOrganizerProfile(user.id);
  if (!profile || profile.status !== "approved") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const event = await fetchOwnedEvent(user.id, params.id);
  if (!event) return NextResponse.json({ error: "not found" }, { status: 404 });

  const entries = await fetchEventEntries(event.id);
  const header = ["No", "名前", "ダンサーネーム", "クルー", "部門", "メール", "状態", "申込日時"];
  const lines = [header.join(",")];
  entries.forEach((e, i) => {
    lines.push(
      [
        String(i + 1),
        csvCell(e.name),
        csvCell(e.dancerName ?? ""),
        csvCell(e.crew ?? ""),
        csvCell(e.category ?? ""),
        csvCell(e.email),
        csvCell(STATUS_LABEL[e.status] ?? e.status),
        csvCell(e.createdAt.slice(0, 19).replace("T", " ")),
      ].join(","),
    );
  });
  const csv = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="entries-${event.id.slice(0, 8)}.csv"`,
    },
  });
}
