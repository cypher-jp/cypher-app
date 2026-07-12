import { defineRouting } from "next-intl/routing";

// 対応言語: ja(デフォルト) / en / ko / zh / fr
// localePrefix: "always" なので、デフォルト言語(ja)にも /ja プレフィックスが付く。
// ルートパス "/" にアクセスすると、Accept-Language を見て該当ロケールへ自動リダイレクトされる。
export const routing = defineRouting({
  locales: ["ja", "en", "ko", "zh", "fr"],
  defaultLocale: "ja",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
