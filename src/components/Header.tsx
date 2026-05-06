import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="display text-2xl font-black tracking-tight">
          CYPHER
          <span className="ml-2 text-cypher-red">●</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-bold">
          <Link
            href="/"
            className="rounded-full px-3 py-1.5 uppercase tracking-wider hover:bg-ink hover:text-paper"
          >
            Events
          </Link>
          <Link
            href="/calendar"
            className="rounded-full px-3 py-1.5 uppercase tracking-wider hover:bg-ink hover:text-paper"
          >
            Calendar
          </Link>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-ink px-3 py-1.5 uppercase tracking-wider text-paper hover:bg-cypher-red sm:inline-flex"
          >
            Submit
          </a>
        </nav>
      </div>
    </header>
  );
}
