import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getContributorByHandle } from "@/lib/db/queries/contributors";
import { buildSeoMetadata } from "@/lib/seo";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale; handle: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, handle } = await params;
  const contributor = await getContributorByHandle(handle);
  if (!contributor) return {};

  const t = await getTranslations({ locale, namespace: "contributors" });
  const name = contributor.display_name ?? contributor.handle;

  return buildSeoMetadata({
    locale,
    path: `/contributors/${contributor.handle}`,
    title: t("profileTitle", { name }),
    description: t("profileDescription", { name }),
  });
}

export default async function ContributorProfilePage({ params }: Props) {
  noStore();
  headers();
  const { locale, handle } = await params;

  const t = await getTranslations("contributors");
  const common = await getTranslations("common");
  const contributor = await getContributorByHandle(handle);
  if (!contributor) notFound();

  const name = contributor.display_name ?? contributor.handle;
  const joinedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
  }).format(new Date(contributor.created_at));
  const badges: string[] = [];
  if (contributor.stats.approved_submission_count >= 1) {
    badges.push(t("badgeContributor"));
  }
  if (contributor.stats.first_contributor_count >= 1) {
    badges.push(t("badgeFirstContributor"));
  }
  if (contributor.stats.accuracy_vote_count >= 10) {
    badges.push(t("badgeAccuracySpotter"));
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link
            href="/contributors"
            className="text-sm text-gray-500 transition-colors hover:text-gray-900"
          >
            {common("back")}
          </Link>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <ContributorAvatar name={name} avatarUrl={contributor.avatar_url} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                @{contributor.handle} · {t("joined", { date: joinedDate })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <ProfileStat
            label={t("updated")}
            value={contributor.stats.approved_submission_count}
          />
          <ProfileStat
            label={t("firsts")}
            value={contributor.stats.first_contributor_count}
          />
          <ProfileStat
            label={t("accuracy")}
            value={contributor.stats.accuracy_vote_count}
          />
        </section>

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">{t("badges")}</h2>
          {badges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700"
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">{t("noBadges")}</p>
          )}
        </section>
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
        className="h-20 w-20 shrink-0 rounded-full bg-cover bg-center bg-gray-200"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xl font-semibold text-gray-600"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
