import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SubmitGymForm } from "@/components/submit/SubmitGymForm";
import { requireFirebaseSession } from "@/lib/auth/session";
import { getGymEquipmentBrandSlugs } from "@/lib/db/queries/equipment-brands";
import { getGymById } from "@/lib/db/queries/gyms";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "submit" });
  return buildSeoMetadata({
    locale,
    path: "/submit",
    title: t("title"),
    description: t("description"),
  });
}

export default async function SubmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: { gymId?: string; returnTo?: string };
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const gymIdQuery = searchParams.gymId
    ? `gymId=${encodeURIComponent(searchParams.gymId)}`
    : "";
  const returnToQuery = searchParams.returnTo
    ? `returnTo=${encodeURIComponent(searchParams.returnTo)}`
    : "";
  const query = [gymIdQuery, returnToQuery].filter(Boolean).join("&");
  const submitPath = `/${locale}/submit${query ? `?${query}` : ""}`;

  await requireFirebaseSession(
    `/${locale}/login?next=${encodeURIComponent(submitPath)}`
  );

  const initialGym = searchParams.gymId
    ? await getGymById(searchParams.gymId)
    : null;
  const initialBrandSlugs =
    searchParams.gymId && initialGym
      ? await getGymEquipmentBrandSlugs(searchParams.gymId)
      : [];

  if (searchParams.gymId && !initialGym) notFound();

  const returnTo =
    searchParams.returnTo?.startsWith("/") && !searchParams.returnTo.startsWith("//")
      ? searchParams.returnTo
      : initialGym
        ? `/gyms/${initialGym.slug}`
        : undefined;

  return (
    <main className="min-h-screen bg-gray-50">
      <SubmitGymForm
        gymId={searchParams.gymId}
        initialGym={initialGym}
        initialBrandSlugs={initialBrandSlugs}
        returnTo={returnTo}
      />
    </main>
  );
}
