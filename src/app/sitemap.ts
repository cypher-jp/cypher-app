import type { MetadataRoute } from "next";
import { fetchEvents } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";
import { routing } from "@/i18n/routing";

function localeAlternates(pathSuffix: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${SITE_URL}/${locale}${pathSuffix}`;
  }
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // fetchEvents は status = published のイベントのみ返す（src/lib/supabase.ts参照）。
  const events = await fetchEvents();
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    entries.push({
      url: `${SITE_URL}/${locale}`,
      lastModified,
      changeFrequency: "daily",
      priority: locale === routing.defaultLocale ? 1 : 0.9,
      alternates: { languages: localeAlternates("") },
    });
    entries.push({
      url: `${SITE_URL}/${locale}/calendar`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.6,
      alternates: { languages: localeAlternates("/calendar") },
    });
    entries.push({
      url: `${SITE_URL}/${locale}/archive`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.5,
      alternates: { languages: localeAlternates("/archive") },
    });
    for (const event of events) {
      entries.push({
        url: `${SITE_URL}/${locale}/events/${event.id}`,
        lastModified,
        changeFrequency: "daily",
        priority: 0.8,
        alternates: { languages: localeAlternates(`/events/${event.id}`) },
      });
    }
  }

  return entries;
}
