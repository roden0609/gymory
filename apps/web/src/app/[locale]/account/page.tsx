import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AccountProfileForm } from "@/components/account/AccountProfileForm";
import { Link } from "@/i18n/navigation";
import { requireFirebaseSession } from "@/lib/auth/session";
import { refreshContributorStats } from "@/lib/db/contributor-stats";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });

  return buildSeoMetadata({
    locale,
    path: "/account",
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  noStore();
  headers();
  const { locale } = await params;

  const user = await requireFirebaseSession(
    `/${locale}/login?next=${encodeURIComponent(`/${locale}/account`)}`
  );
  const supabase = createAdminClient();
  const appUser = await ensureAppUser(user, supabase);
  const stats = await refreshContributorStats(appUser.id, supabase);
  const t = await getTranslations("account");
  const common = await getTranslations("common");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link
            href="/search"
            className="text-sm text-gray-500 transition-colors hover:text-gray-900"
          >
            {common("back")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">{t("h1")}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            {t("intro")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <AccountProfileForm
          initialDisplayName={appUser.display_name ?? ""}
          initialHandle={appUser.handle ?? ""}
          avatarUrl={appUser.avatar_url}
          email={appUser.firebase_email}
          stats={{
            updated: stats.approved_submission_count,
            firsts: stats.first_contributor_count,
            accuracy: stats.accuracy_vote_count,
          }}
        />
      </div>
    </main>
  );
}
