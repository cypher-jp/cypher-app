import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SubmitButton from "@/components/admin/SubmitButton";
import { submitContactAction } from "@/app/[locale]/contact/actions";
import { CONTACT_CATEGORIES } from "@/lib/contact";

interface Props {
  params: { locale: string };
  searchParams: { sent?: string; error?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "contact" });
  return { title: t("title") };
}

/** お問い合わせフォーム。送信内容はSupabaseのcontactsへ保存され、管理画面で確認できる */
export default async function ContactPage({ params, searchParams }: Props) {
  setRequestLocale(params.locale);
  const t = await getTranslations("contact");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="display text-4xl font-black uppercase tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-2 text-ink/60">{t("lead")}</p>

      {searchParams.sent && (
        <div className="mt-6 rounded-xl border border-cypher-green/30 bg-cypher-green/10 px-4 py-3 text-sm text-cypher-green">
          {t("sent")}
        </div>
      )}
      {searchParams.error && (
        <div className="mt-6 rounded-xl border border-cypher-red/30 bg-cypher-red/10 px-4 py-3 text-sm text-cypher-red">
          {t("error")}
        </div>
      )}

      <form
        action={submitContactAction.bind(null, params.locale)}
        className="mt-8 flex flex-col gap-5"
      >
        {/* ハニーポット(スパム対策): 人間には見えない。入力されたら保存しない */}
        <div className="hidden" aria-hidden="true">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
            {t("categoryLabel")}
          </label>
          <select
            name="category"
            className="rounded-xl border border-ink/15 bg-paper px-4 py-2.5 text-sm focus:border-ink focus:outline-none"
          >
            {CONTACT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
            {t("name")}
          </label>
          <input
            type="text"
            name="name"
            className="rounded-xl border border-ink/15 bg-paper px-4 py-2.5 text-sm focus:border-ink focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
            {t("email")} <span className="text-cypher-red">*</span>
          </label>
          <input
            type="email"
            name="email"
            required
            className="rounded-xl border border-ink/15 bg-paper px-4 py-2.5 text-sm focus:border-ink focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
            {t("message")} <span className="text-cypher-red">*</span>
          </label>
          <textarea
            name="message"
            rows={7}
            required
            className="rounded-xl border border-ink/15 bg-paper px-4 py-2.5 text-sm focus:border-ink focus:outline-none"
          />
        </div>

        {/* 個人情報の扱いの明示: 送信=ポリシー同意とみなす方式(チェックボックス不要で手間を増やさない) */}
        <p className="text-xs text-ink/50">
          {t("consentBefore")}
          <Link href="/privacy" className="underline hover:text-ink">
            {t("consentLink")}
          </Link>
          {t("consentAfter")}
        </p>

        <div className="flex justify-end">
          <SubmitButton label={t("submit")} pendingLabel={t("sending")} />
        </div>
      </form>
    </div>
  );
}
