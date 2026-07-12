"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSelect(nextLocale: string) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <select
      aria-label={t("label")}
      value={locale}
      disabled={isPending}
      onChange={(e) => onSelect(e.target.value)}
      className="rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-xs font-bold uppercase tracking-wider focus:border-ink focus:outline-none disabled:opacity-50"
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {t(l)}
        </option>
      ))}
    </select>
  );
}
