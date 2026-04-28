import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { AdminSubmissionsReview } from "@/components/admin/AdminSubmissionsReview";
import { getPendingSubmissions } from "@/lib/db/queries/submissions";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession(
    `/${locale}/login?next=/${locale}/admin/submissions`,
    `/${locale}`
  );

  const t = await getTranslations("admin");
  const tCommon = await getTranslations("common");
  const submissions = await getPendingSubmissions();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/admin"
          className="inline-block text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          {tCommon("back")}
        </Link>
        <h1 className="text-2xl font-bold">{t("submissions")}</h1>
        <AdminSubmissionsReview submissions={submissions} />
      </div>
    </main>
  );
}
