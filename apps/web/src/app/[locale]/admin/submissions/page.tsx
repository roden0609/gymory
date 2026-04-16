import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function AdminSubmissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">{t("submissions")}</h1>
      {/* TODO: list pending gym_update_submissions, approve/reject */}
    </main>
  );
}
