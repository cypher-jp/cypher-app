import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "WORLD Cypher. — ストリートダンスバトル情報サイト",
  description:
    "国内・海外のダンスバトル情報を、ジャンル × エリアで検索。エントリー先まで一直線。",
  openGraph: {
    title: "WORLD Cypher.",
    description:
      "国内・海外のダンスバトル情報を、ジャンル × エリアで検索。エントリー先まで一直線。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
