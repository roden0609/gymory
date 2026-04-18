import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SubmitGymForm } from "@/components/submit/SubmitGymForm";

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
  const returnTo =
    searchParams.returnTo?.startsWith("/") && !searchParams.returnTo.startsWith("//")
      ? searchParams.returnTo
      : undefined;

  return (
    <main className="min-h-screen bg-gray-50">
      <SubmitGymForm gymId={searchParams.gymId} returnTo={returnTo} />
    </main>
  );
}
