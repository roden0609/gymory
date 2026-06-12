import type { Metadata } from "next";
import {
  TrainingCollectionPage,
  generateTrainingCollectionMetadata,
} from "@/components/training/TrainingCollectionPage";
import type { RawSearchParams } from "@/lib/db/queries/search-gyms";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: RawSearchParams & { view?: string };
};

const TRAINING_SLUG = "hyrox-official-hong-kong";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return generateTrainingCollectionMetadata({ locale, training: TRAINING_SLUG });
}

export default async function HyroxOfficialHongKongPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  return (
    <TrainingCollectionPage
      locale={locale}
      training={TRAINING_SLUG}
      searchParams={searchParams}
    />
  );
}
