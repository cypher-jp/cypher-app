import type { MetadataRoute } from "next";
import { fetchEvents } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // fetchEvents は status = published のイベントのみ返す（src/lib/supabase.ts参照）。
  const events = await fetchEvents();

  const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${SITE_URL}/events/${event.id}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/calendar`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    ...eventEntries,
  ];
}
