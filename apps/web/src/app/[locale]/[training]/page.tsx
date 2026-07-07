import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  TrainingCollectionPage,
  generateTrainingCollectionMetadata,
} from "@/components/training/TrainingCollectionPage";
import type { RawSearchParams } from "@/lib/db/queries/search-gyms";
import {
  TRAINING_PAGE_DEFINITIONS,
  getTrainingPageDefinition,
} from "@/lib/training-pages";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale; training: string }>;
  searchParams: RawSearchParams & { view?: string };
};

export function generateStaticParams() {
  return TRAINING_PAGE_DEFINITIONS.map((training) => ({
    training: training.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, training } = await params;
  return generateTrainingCollectionMetadata({ locale, training });
}

export default async function TrainingLandingPage({ params, searchParams }: Props) {
  const { locale, training } = await params;
  if (!getTrainingPageDefinition(training)) notFound();

  return (
    <TrainingCollectionPage
      locale={locale}
      training={training}
      searchParams={searchParams}
    />
  );
}
