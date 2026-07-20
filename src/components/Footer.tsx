import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");

  return (
    <footer className="border-t border-ink/10 bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="display text-3xl font-black">
              <span className="text-cypher-red">WORLD</span> Cypher
              <span className="text-cypher-red">.</span>
            </div>
            <p className="mt-2 max-w-md text-sm text-paper/70">{t("tagline")}</p>
          </div>
          <div className="flex flex-col gap-1 text-xs text-paper/60 md:items-end">
            <span>{t("copyright", { year: new Date().getFullYear() })}</span>
            <a
              href="https://www.instagram.com/world_cypher/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-paper"
            >
              {t("contact")}
            </a>
            <Link href="/archive" className="hover:text-paper">
              {tNav("archive")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
