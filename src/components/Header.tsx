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
        <Link
          href="/"
          className="display shrink-0 text-2xl font-black tracking-tight"
        >
          <span className="text-cypher-red">WORLD</span> Cypher
          <span className="text-cypher-red">.</span>
        </Link>
        {/*
          スマホ幅ではロゴ込みで全項目がコンテナ幅に収まらないため、nav自体を
          横スクロールコンテナにして封じ込める(min-w-0で縮小を許可 + overflow-x-auto)。
          これが無いと、nav全体の実寸がページ(body/html)の横幅を押し広げ、
          画面全体が横スクロールしてしまう。
        */}
        <nav className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto text-sm font-bold">
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 uppercase tracking-wider hover:bg-ink hover:text-paper"
          >
            {t("events")}
          </Link>
          <Link
            href="/calendar"
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 uppercase tracking-wider hover:bg-ink hover:text-paper"
          >
            {t("calendar")}
          </Link>
          <Link
            href="/archive"
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 uppercase tracking-wider hover:bg-ink hover:text-paper"
          >
            {t("archive")}
          </Link>
          <a
            href="https://www.instagram.com/world_cypher/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 uppercase tracking-wider text-paper hover:bg-cypher-red sm:inline-flex"
          >
            {t("submit")}
          </a>
          <span className="shrink-0">
            <LocaleSwitcher />
          </span>
        </nav>
      </div>
    </header>
  );
}
