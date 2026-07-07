import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { generateTrainingCollectionMetadata } from "@/components/training/TrainingCollectionPage";

type Locale = "en" | "zh-HK";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const TRAINING_SLUG = "hyrox-friendly-hong-kong";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return generateTrainingCollectionMetadata({ locale, training: TRAINING_SLUG });
}

export default async function HyroxFriendlyHongKongPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/${TRAINING_SLUG}`);
}
