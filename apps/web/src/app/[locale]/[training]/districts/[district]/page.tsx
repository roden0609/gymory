import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  TrainingCollectionPage,
  generateTrainingCollectionMetadata,
} from "@/components/training/TrainingCollectionPage";
import {
  DISTRICT_PAGE_DEFINITIONS,
  getDistrictPageDefinition,
} from "@/lib/district-pages";
import type { RawSearchParams } from "@/lib/db/queries/search-gyms";
import {
  TRAINING_PAGE_DEFINITIONS,
  getTrainingPageDefinition,
} from "@/lib/training-pages";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale; training: string; district: string }>;
  searchParams: RawSearchParams & { view?: string };
};

export function generateStaticParams() {
  return TRAINING_PAGE_DEFINITIONS.flatMap((training) =>
    DISTRICT_PAGE_DEFINITIONS.map((district) => ({
      training: training.slug,
      district: district.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, training, district: districtSlug } = await params;
  const district = getDistrictPageDefinition(districtSlug);
  if (!district) return {};

  return generateTrainingCollectionMetadata({
    locale,
    training,
    district,
  });
}

export default async function TrainingDistrictLandingPage({
  params,
  searchParams,
}: Props) {
  const { locale, training, district: districtSlug } = await params;
  if (!getTrainingPageDefinition(training)) notFound();

  const district = getDistrictPageDefinition(districtSlug);
  if (!district) notFound();

  return (
    <TrainingCollectionPage
      locale={locale}
      training={training}
      searchParams={searchParams}
      fixedDistrict={district.code}
    />
  );
}
