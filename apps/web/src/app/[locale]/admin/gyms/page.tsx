import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminGymsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession(
    `/${locale}/login?next=/${locale}/admin/gyms`,
    `/${locale}`
  );

  const t = await getTranslations("admin");

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">{t("manageGyms")}</h1>
      {/* TODO: list all gyms, edit/verify/deactivate */}
    </main>
  );
}
