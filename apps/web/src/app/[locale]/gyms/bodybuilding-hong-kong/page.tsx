import type { Metadata } from "next";
import {
  TrainingCollectionPage,
  generateTrainingCollectionMetadata,
} from "@/components/training/TrainingCollectionPage";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const TRAINING_SLUG = "bodybuilding-hong-kong";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return generateTrainingCollectionMetadata({ locale, training: TRAINING_SLUG });
}

export default async function BodybuildingHongKongPage({ params }: Props) {
  const { locale } = await params;
  return <TrainingCollectionPage locale={locale} training={TRAINING_SLUG} />;
}
