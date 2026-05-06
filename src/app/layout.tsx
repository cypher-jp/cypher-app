import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "CYPHER — 国際ダンスイベントアグリゲーター",
  description:
    "種別 × ジャンル × エリアで絞り込める、国内・海外のダンスイベント情報プラットフォーム。広告なし、必要な情報だけ。",
  openGraph: {
    title: "CYPHER",
    description: "国際ダンスイベントアグリゲーター",
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
