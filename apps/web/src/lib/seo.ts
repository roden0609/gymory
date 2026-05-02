import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

type Locale = (typeof routing.locales)[number];

const OG_LOCALES: Record<Locale, string> = {
  en: "en_US",
  "zh-HK": "zh_HK",
};

export function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://gymory.io").replace(
    /\/+$/,
    ""
  );
}

export function getLocalizedPath(locale: string, path = "/") {
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalizedPath}`;
}

export function getLocalizedUrl(locale: string, path = "/") {
  return `${getBaseUrl()}${getLocalizedPath(locale, path)}`;
}

export function getLocalizedAlternates(locale: string, path = "/") {
  const languages = Object.fromEntries(
    routing.locales.map((availableLocale) => [
      availableLocale,
      getLocalizedPath(availableLocale, path),
    ])
  );

  return {
    canonical: getLocalizedPath(locale, path),
    languages: {
      ...languages,
      "x-default": getLocalizedPath(routing.defaultLocale, path),
    },
  };
}

export function buildSeoMetadata({
  locale,
  path = "/",
  title,
  description,
  robots,
}: {
  locale: string;
  path?: string;
  title: string;
  description: string;
  robots?: Metadata["robots"];
}): Metadata {
  const ogLocale = OG_LOCALES[locale as Locale] ?? OG_LOCALES.en;
  const alternateLocale = routing.locales
    .filter((availableLocale) => availableLocale !== locale)
    .map((availableLocale) => OG_LOCALES[availableLocale] ?? availableLocale);

  return {
    metadataBase: new URL(getBaseUrl()),
    title,
    description,
    alternates: getLocalizedAlternates(locale, path),
    openGraph: {
      type: "website",
      siteName: "Gymory",
      title,
      description,
      url: getLocalizedPath(locale, path),
      locale: ogLocale,
      alternateLocale,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots,
  };
}
