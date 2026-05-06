import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <div className="display text-7xl font-black">404</div>
      <h1 className="display mt-4 text-3xl font-black">EVENT NOT FOUND</h1>
      <p className="mt-3 text-ink/70">
        このイベントは終了したか、存在しません。
      </p>
      <Link href="/" className="btn-primary mt-8">
        トップに戻る
      </Link>
    </div>
  );
}
