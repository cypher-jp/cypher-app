export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="display text-3xl font-black">CYPHER</div>
            <p className="mt-2 max-w-md text-sm text-paper/70">
              国際ダンスイベントアグリゲーター。広告なし、必要な情報だけ。
            </p>
          </div>
          <div className="flex flex-col gap-1 text-xs text-paper/60 md:items-end">
            <span>© {new Date().getFullYear()} CYPHER</span>
            <span>イベント掲載のお問い合わせ → DM @cypher</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
