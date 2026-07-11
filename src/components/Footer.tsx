export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="display text-3xl font-black">
              <span className="text-cypher-red">WORLD</span> Cypher
              <span className="text-cypher-red">.</span>
            </div>
            <p className="mt-2 max-w-md text-sm text-paper/70">
              ストリートダンスバトル情報サイト。広告なし、必要な情報だけ。
            </p>
          </div>
          <div className="flex flex-col gap-1 text-xs text-paper/60 md:items-end">
            <span>© {new Date().getFullYear()} WORLD Cypher.</span>
            <a
              href="https://www.instagram.com/world_cypher/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-paper"
            >
              イベント掲載のお問い合わせ → @world_cypher
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
