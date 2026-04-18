import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SubmitGymForm } from "@/components/submit/SubmitGymForm";
import { getGymById } from "@/lib/db/queries/gyms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "submit" });
  return { title: t("title") };
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
  const initialGym = searchParams.gymId
    ? await getGymById(searchParams.gymId)
    : null;

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
        returnTo={returnTo}
      />
    </main>
  );
}
