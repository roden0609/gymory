import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/common/SiteHeader";
import { routing } from "@/i18n/routing";
import { getBaseUrl } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Gymory — Find gyms with the equipment you need",
    template: "%s | Gymory",
  },
  description:
    "Search nearby gyms by racks, machines, and real training gear. Find the right gym — not just the nearest one.",
  applicationName: "Gymory",
  openGraph: {
    type: "website",
    siteName: "Gymory",
    title: "Gymory — Find gyms with the equipment you need",
    description:
      "Search nearby gyms by racks, machines, and real training gear. Find the right gym — not just the nearest one.",
  },
  twitter: {
    card: "summary",
    title: "Gymory — Find gyms with the equipment you need",
    description:
      "Search nearby gyms by racks, machines, and real training gear. Find the right gym — not just the nearest one.",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className={inter.className}>
        <Suspense fallback={null}>
          <SiteHeader />
        </Suspense>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
