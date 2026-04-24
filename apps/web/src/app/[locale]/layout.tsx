import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/common/SiteHeader";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Gymory — Find gyms with the equipment you need",
    template: "%s | Gymory",
  },
  description:
    "Search nearby gyms by racks, machines, and real training gear. Find the right gym — not just the nearest one.",
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
        <SiteHeader />
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
