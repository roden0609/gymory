import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
      {/* TODO: links to /admin/gyms, /admin/submissions */}
    </main>
  );
}
