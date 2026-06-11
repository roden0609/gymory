import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const TRAINING_TAG_SLUGS = [
  "hyrox-official-hong-kong",
  "olympic-lifting-hong-kong",
  "powerlifting-hong-kong",
  "bodybuilding-hong-kong",
  "hybrid-training-hong-kong",
] as const;

export async function TrainingTagLinks() {
  const trainingPages = await getTranslations("trainingPages");

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {TRAINING_TAG_SLUGS.map((slug) => (
        <Link
          key={slug}
          href={`/gyms/${slug}`}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          {trainingPages(`items.${slug}.tagLabel`)}
        </Link>
      ))}
    </div>
  );
}
