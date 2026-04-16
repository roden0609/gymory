import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "submit" });
  return { title: t("title") };
}

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("submit");

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-gray-500">{t("description")}</p>
      {/* TODO: SubmitGymForm */}
    </main>
  );
}
