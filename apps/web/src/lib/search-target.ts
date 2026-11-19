import { getDistrictPageDefinition } from "./district-pages";
import { getTrainingPageDefinition } from "./training-pages";

/** Resolve filter-only route context while the previous page is still visible. */
export function getSearchTarget(href: string) {
  const url = new URL(href, "https://search.invalid");
  const pathname = url.pathname;
  const parts = pathname.split("/").filter(Boolean);
  const districtIndex = parts.indexOf("districts");
  const district = districtIndex >= 0 ? getDistrictPageDefinition(parts[districtIndex + 1] ?? "")?.code : undefined;
  const gymChain = parts[0] === "gym-brands" ? parts[1] : undefined;
  const collection = getTrainingPageDefinition(parts[0] ?? "")?.slug;
  const params = new URLSearchParams(url.search);
  // Use a stable key, independent of query parameter ordering.
  params.sort();
  return { pathname, query: params.toString(), key: `${pathname}?${params}`, district, gymChain, collection };
}
