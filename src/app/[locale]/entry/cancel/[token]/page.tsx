import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cancelEntrySubmitAction } from "@/app/entry-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: { locale: string; token: string };
  searchParams: { done?: string };
}

/** エントリーの本人キャンセルページ(エントリー完了時に発行されるリンク先) */
export default async function EntryCancelPage({ params, searchParams }: Props) {
  setRequestLocale(params.locale);
  const t = await getTranslations("entry");

  const done = searchParams.done === "1";
  const failed = searchParams.done === "0";

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="display text-3xl font-black">{t("cancelTitle")}</h1>

      {done ? (
        <>
          <p className="mt-6 text-sm leading-relaxed text-ink/70">{t("cancelDone")}</p>
          <Link href="/" className="btn-primary mt-8 inline-block">
            {t("backToTop")}
          </Link>
        </>
      ) : failed ? (
        <p className="mt-6 text-sm leading-relaxed text-ink/70">{t("cancelNotFound")}</p>
      ) : (
        <>
          <p className="mt-6 text-sm leading-relaxed text-ink/70">{t("cancelConfirm")}</p>
          <form
            action={cancelEntrySubmitAction.bind(null, params.locale, params.token)}
            className="mt-8"
          >
            <button type="submit" className="btn-primary">
              {t("cancelButton")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
