import { Link } from "@/i18n/navigation";
import HeaderNav from "@/components/HeaderNav";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
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
        <HeaderNav />
      </div>
    </header>
  );
}
