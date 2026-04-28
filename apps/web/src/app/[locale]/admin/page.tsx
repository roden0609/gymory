import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession(`/${locale}/login?next=/${locale}/admin`, `/${locale}`);

  const t = await getTranslations("admin");

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("dashboard")}</h1>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/gyms"
            className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300"
          >
            <p className="text-lg font-semibold text-gray-900">{t("manageGyms")}</p>
            <p className="mt-1 text-sm text-gray-500">/admin/gyms</p>
          </Link>

          <Link
            href="/admin/submissions"
            className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300"
          >
            <p className="text-lg font-semibold text-gray-900">{t("submissions")}</p>
            <p className="mt-1 text-sm text-gray-500">/admin/submissions</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
