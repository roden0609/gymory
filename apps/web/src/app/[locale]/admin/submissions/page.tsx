import { getTranslations, setRequestLocale } from "next-intl/server";
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
  const submissions = await getPendingSubmissions();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">{t("submissions")}</h1>
      <AdminSubmissionsReview submissions={submissions} />
      </div>
    </main>
  );
}
