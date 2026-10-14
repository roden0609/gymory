"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { GYM_CHAINS } from "@gymory/shared";
import { Link, useRouter } from "@/i18n/navigation";
import { trackGymBrandFilter } from "@/lib/analytics";
import { getSearchBrowseHref, getSelectedDistricts } from "@/lib/search-navigation";
import { MultiSelectFilter } from "./MultiSelectFilter";

export function GymBrandSearch({ currentDistrictCode, currentGymChainSlug, trainingSlug }: {
  currentDistrictCode?: string;
  currentGymChainSlug?: string;
  trainingSlug?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("search");
  const params = new URLSearchParams(searchParams.toString());
  const selected = currentGymChainSlug ? [currentGymChainSlug] : (params.get("gymChains") ?? "").split(",").filter(Boolean);

  return (
    <section className="min-w-0 max-w-full">
      <h2 className="mb-2 text-sm font-semibold text-gray-900"><Link href="/gym-brands" className="hover:underline">{t("gymBrands")}</Link></h2>
      <MultiSelectFilter filterKey="gymChains" label={t("gymBrands")} placeholder={t("anyGymBrand")}
        options={GYM_CHAINS.map((chain) => ({ value: chain.slug, label: locale === "zh-HK" && chain.name_zh ? chain.name_zh : chain.name_en }))}
        selected={selected}
        onChange={(next) => {
          for (const chain of GYM_CHAINS) {
            if (selected.includes(chain.slug) === next.includes(chain.slug)) continue;
            trackGymBrandFilter({ gym_chain: chain.slug, filter_param: "gymChains", selected: next.includes(chain.slug), source: "search_page" });
          }
          router.push(getSearchBrowseHref({ params, districtSlugs: getSelectedDistricts(params, currentDistrictCode).map((item) => item.slug), gymChainSlugs: next, trainingSlug }), { scroll: false });
        }} />
    </section>
  );
}
