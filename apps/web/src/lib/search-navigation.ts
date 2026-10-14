import { GYM_CHAINS } from "@gymory/shared";
import { DISTRICT_PAGE_DEFINITIONS } from "./district-pages";
import { getTrainingPageDefinition } from "./training-pages";

export function getSelectedDistricts(params: URLSearchParams, fixedDistrict?: string) {
  const values = fixedDistrict
    ? [fixedDistrict]
    : (params.get("districts") ?? params.get("district") ?? "").split(",");
  return DISTRICT_PAGE_DEFINITIONS.filter((district) =>
    values.some((value) => value.trim() === district.slug || value.trim() === district.code)
  );
}

/** Keep equivalent selections in a stable order and retain unrelated filters. */
export function getSearchBrowseHref({
  params: currentParams,
  districtSlugs,
  gymChainSlugs,
  trainingSlug,
}: {
  params: URLSearchParams;
  districtSlugs: string[];
  gymChainSlugs: string[];
  trainingSlug?: string;
}) {
  const params = new URLSearchParams(currentParams);
  const districts = DISTRICT_PAGE_DEFINITIONS.filter((item) => districtSlugs.includes(item.slug));
  const chains = GYM_CHAINS.filter((item) => gymChainSlugs.includes(item.slug));
  const training = getTrainingPageDefinition(trainingSlug ?? params.get("collection") ?? "");
  for (const key of ["district", "districts", "gymChains", "collection", "page", "pageSize", "flash"]) {
    params.delete(key);
  }

  let path = "/search";
  if (districts.length === 1) {
    path = training
      ? `/${training.slug}/districts/${districts[0].slug}`
      : `/districts/${districts[0].slug}`;
  } else if (districts.length > 1) {
    params.set("districts", districts.map((item) => item.slug).join(","));
    if (training) params.set("collection", training.slug);
  } else if (training) {
    path = `/${training.slug}`;
  } else if (chains.length === 1) {
    path = `/gym-brands/${chains[0].slug}`;
  }
  if (chains.length && !path.startsWith("/gym-brands/")) {
    params.set("gymChains", chains.map((item) => item.slug).join(","));
  }
  params.sort();
  return params.size ? `${path}?${params}` : path;
}
