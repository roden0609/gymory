"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isPlainLinkClick } from "@/lib/link-navigation";
import { useSearchNavigation } from "./SearchNavigation";

const TRAINING_TAG_SLUGS = [
  "hyrox-official-hong-kong",
  "olympic-lifting-hong-kong",
  "powerlifting-hong-kong",
  "bodybuilding-hong-kong",
  "hybrid-training-hong-kong",
] as const;

export function TrainingTagLinks({ currentDistrictSlug }: { currentDistrictSlug?: string }) {
  const t = useTranslations("trainingPages");
  const pathname = usePathname();
  const { target, navigate, isPending } = useSearchNavigation();
  const activePath = isPending && target ? target.pathname : pathname;

  return (
    <nav aria-label={t("navigationLabel")} className="mb-5 flex min-w-0 flex-wrap gap-2">
      {TRAINING_TAG_SLUGS.map((slug) => {
        const href = currentDistrictSlug ? `/${slug}/districts/${currentDistrictSlug}` : `/${slug}`;
        const active = href === activePath;
        return (
          <Link
            key={slug}
            href={href}
            aria-current={href === pathname ? "page" : undefined}
            onClick={(event) => {
              if (!isPlainLinkClick(event)) return;
              event.preventDefault();
              navigate(href);
            }}
            className={`inline-flex min-h-9 max-w-full items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${active
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"}`}
          >
            {t(`items.${slug}.tagLabel`)}
          </Link>
        );
      })}
    </nav>
  );
}
