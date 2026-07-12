import Link from "next/link";
import type { EventStatus } from "@/types/event";
import { ADMIN_STATUS_LABEL } from "@/lib/admin/labels";

const TAB_ORDER: EventStatus[] = ["pending", "published", "draft"];

interface Props {
  current: EventStatus;
  counts: Record<EventStatus, number>;
}

export default function AdminTabs({ current, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-ink/10 pb-4">
      {TAB_ORDER.map((tab) => (
        <Link
          key={tab}
          href={`/admin?tab=${tab}`}
          className={`rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wider transition ${
            current === tab
              ? "bg-ink text-paper"
              : "border border-ink/15 text-ink hover:border-ink"
          }`}
        >
          {ADMIN_STATUS_LABEL[tab]} ({counts[tab]})
        </Link>
      ))}
    </div>
  );
}
