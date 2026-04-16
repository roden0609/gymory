// Home / Marketing page
// TODO: Add hero, quick filter chips, nearby gym list

import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">{t("hero")}</h1>
      <p className="mt-2 text-gray-500">{t("heroSub")}</p>
      {/* TODO: SearchBar + QuickFilters + NearbyGymList */}
    </main>
  );
}
