import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default async function Header() {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        {/*
          public/logo.png を配置したら、下のテキストロゴを next/image に差し替える。
          例:
            import Image from "next/image";
            <Link href="/">
              <Image
                src="/logo.png"
                alt="WORLD Cypher."
                width={160}
                height={40}
                className="h-8 w-auto md:h-10"
                priority
              />
            </Link>
        */}
        <Link href="/" className="display text-2xl font-black tracking-tight">
          <span className="text-cypher-red">WORLD</span> Cypher
          <span className="text-cypher-red">.</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-bold">
          <Link
            href="/"
            className="rounded-full px-3 py-1.5 uppercase tracking-wider hover:bg-ink hover:text-paper"
          >
            {t("events")}
          </Link>
          <Link
            href="/calendar"
            className="rounded-full px-3 py-1.5 uppercase tracking-wider hover:bg-ink hover:text-paper"
          >
            {t("calendar")}
          </Link>
          <a
            href="https://www.instagram.com/world_cypher/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-ink px-3 py-1.5 uppercase tracking-wider text-paper hover:bg-cypher-red sm:inline-flex"
          >
            {t("submit")}
          </a>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
