import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

interface PrivacyPageProps {
  params: { locale: string };
}

export async function generateMetadata({
  params,
}: PrivacyPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "privacy" });
  return {
    title: t("title"),
    robots: { index: true, follow: true },
  };
}

/** プライバシーポリシー。文言は messages/{locale}.json の "privacy" 名前空間で5言語管理する。 */
export default async function PrivacyPage({ params }: PrivacyPageProps) {
  setRequestLocale(params.locale);
  const t = await getTranslations("privacy");

  const sections = [
    { title: t("s1t"), body: t("s1b") },
    { title: t("s2t"), body: t("s2b") },
    { title: t("s3t"), body: t("s3b") },
    { title: t("s4t"), body: t("s4b") },
    { title: t("s5t"), body: t("s5b") },
    { title: t("s6t"), body: t("s6b") },
    { title: t("s7t"), body: t("s7b") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="display text-3xl font-black uppercase tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-6 leading-relaxed text-ink/80">{t("intro")}</p>
      <div className="mt-8 flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold">{section.title}</h2>
            <p className="mt-2 leading-relaxed text-ink/80">{section.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-10 leading-relaxed text-ink/80">{t("contact")}</p>
      <p className="mt-4 text-sm text-ink/50">{t("updated")}</p>
    </div>
  );
}
