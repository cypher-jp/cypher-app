import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/site";
import { routing, type AppLocale } from "@/i18n/routing";

// Google Analytics 4 の測定ID(公開情報のためコード直書きで問題ない)
const GA_MEASUREMENT_ID = "G-Z8HY61FWY9";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface LayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { locale } = params;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}`;
  }

  const descriptions: Record<AppLocale, string> = {
    ja: "国内・海外のダンスバトル情報を、ジャンル × エリアで検索。エントリー先まで一直線。",
    en: "Discover dance battles worldwide, filtered by genre and region. Straight to the entry page.",
    ko: "전 세계 댄스 배틀 정보를 장르 × 지역으로 검색하세요. 신청 페이지까지 한 번에.",
    zh: "按舞种与地区筛选全球街舞battle信息,直达报名页面。",
    fr: "Découvrez les battles de danse du monde entier, filtrés par style et région.",
  };

  const description =
    descriptions[(locale as AppLocale) in descriptions ? (locale as AppLocale) : "ja"];

  return {
    metadataBase: new URL(SITE_URL),
    title: "WORLD Cypher. — ストリートダンスバトル情報サイト",
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages,
    },
    openGraph: {
      title: "WORLD Cypher.",
      description,
      type: "website",
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "WORLD Cypher.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "WORLD Cypher.",
      description,
      images: ["/og-image.jpg"],
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps) {
  const { locale } = params;

  const locales: readonly string[] = routing.locales;
  if (!locales.includes(locale)) {
    notFound();
  }

  // next-intlの静的レンダリング最適化のため、リクエストロケールを明示しておく。
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col">
        {/* Google Analytics 4: ページ表示後に読み込む(表示速度に影響させない) */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
