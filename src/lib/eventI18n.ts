import { I18N_LOCALES, type DanceEvent, type I18nLocale } from "@/types/event";

function isI18nLocale(locale: string): locale is I18nLocale {
  return (I18N_LOCALES as string[]).includes(locale);
}

/**
 * イベント説明文をロケールに応じて出し分ける。
 * - ja: 常に原文(description)
 * - en/ko/zh/fr: description_i18n[locale] があればそれ、無ければ原文にフォールバック
 * - それ以外の未知ロケール: 原文にフォールバック
 */
export function getLocalizedDescription(
  event: DanceEvent,
  locale: string,
): string {
  if (locale !== "ja" && isI18nLocale(locale)) {
    const translated = event.descriptionI18n?.[locale];
    if (translated && translated.trim()) return translated;
  }
  return event.description;
}
