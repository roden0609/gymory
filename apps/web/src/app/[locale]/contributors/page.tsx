import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTopContributors } from "@/lib/db/queries/contributors";
import { buildSeoMetadata } from "@/lib/seo";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contributors" });

  return buildSeoMetadata({
    locale,
    path: "/contributors",
    title: t("title"),
    description: t("description"),
  });
}

export default async function ContributorsPage({ params }: Props) {
  noStore();
  headers();
  const { locale } = await params;

  const t = await getTranslations("contributors");
  const common = await getTranslations("common");
  const contributors = await getTopContributors();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
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

      <div className="mx-auto max-w-5xl px-4 py-6">
        {contributors.length > 0 ? (
          <div className="space-y-3">
            {contributors.map((contributor, index) => (
              <Link
                key={contributor.id}
                href={`/contributors/${contributor.handle}`}
                className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-400 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-8 text-center text-sm font-semibold text-gray-500">
                    #{index + 1}
                  </span>
                  <ContributorAvatar
                    name={contributor.display_name ?? contributor.handle}
                    avatarUrl={contributor.avatar_url}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">
                      {contributor.display_name ?? contributor.handle}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      @{contributor.handle}
                    </p>
                  </div>
                </div>
                <ContributorStats
                  stats={contributor.stats}
                  labels={{
                    updated: t("updated"),
                    firsts: t("firsts"),
                    accuracy: t("accuracy"),
                  }}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="font-medium text-gray-900">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-gray-500">{t("emptyDescription")}</p>
          </div>
        )}
      </div>
    </main>
  );
}

function ContributorAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <span
        aria-hidden="true"
        className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center bg-gray-200"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function ContributorStats({
  stats,
  labels,
}: {
  stats: {
    approved_submission_count: number;
    first_contributor_count: number;
    accuracy_vote_count: number;
  };
  labels: {
    updated: string;
    firsts: string;
    accuracy: string;
  };
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
      <Stat value={stats.approved_submission_count} label={labels.updated} />
      <Stat value={stats.first_contributor_count} label={labels.firsts} />
      <Stat value={stats.accuracy_vote_count} label={labels.accuracy} />
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="min-w-16 rounded-md bg-gray-50 px-2.5 py-2">
      <span className="block font-semibold text-gray-900">{value}</span>
      <span className="mt-0.5 block">{label}</span>
    </span>
  );
}
