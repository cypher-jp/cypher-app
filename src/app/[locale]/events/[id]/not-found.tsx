import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("event");

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <div className="display text-7xl font-black">404</div>
      <h1 className="display mt-4 text-3xl font-black">{t("notFoundTitle")}</h1>
      <p className="mt-3 text-ink/70">{t("notFoundBody")}</p>
      <Link href="/" className="btn-primary mt-8">
        {t("backHome")}
      </Link>
    </div>
  );
}
