import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function AdminGymsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">{t("manageGyms")}</h1>
      {/* TODO: list all gyms, edit/verify/deactivate */}
    </main>
  );
}
