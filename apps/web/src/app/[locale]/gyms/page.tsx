import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gym" });
  return { title: t("allGyms") };
}

export default async function GymsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("gym");

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">{t("allGyms")}</h1>
      {/* TODO: GymList component */}
    </main>
  );
}
