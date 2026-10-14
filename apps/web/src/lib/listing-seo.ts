import type { Metadata } from "next";
import type { RawSearchParams } from "./db/queries/search-gyms";
import { buildSeoMetadata } from "./seo";

const DISPLAY_PARAMS = new Set(["view", "flash", "no_ga", "gclid", "fbclid"]);

export function getListingSeoState(path: string, rawParams: RawSearchParams = {}) {
  const params = new URLSearchParams();
  let filtered = false;
  for (const [key, rawValue] of Object.entries(rawParams)) {
    if (DISPLAY_PARAMS.has(key) || key.startsWith("utm_")) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (!value?.trim()) continue;
      if (key === "page" && value === "1") continue;
      if (key !== "page" && key !== "pageSize") filtered = true;
      params.append(key, value);
    }
  }
  params.sort();
  return { filtered, canonicalPath: params.size ? `${path}?${params}` : path };
}

export function buildListingSeoMetadata({
  searchParams,
  empty = false,
  ...options
}: Parameters<typeof buildSeoMetadata>[0] & {
  searchParams?: RawSearchParams;
  empty?: boolean;
}): Metadata {
  const { filtered, canonicalPath } = getListingSeoState(options.path ?? "/", searchParams);
  const metadata = buildSeoMetadata({
    ...options,
    path: canonicalPath,
    robots: filtered || empty ? { index: false, follow: true } : undefined,
  });
  // Filtered results have their own canonical, rather than claiming to duplicate the unfiltered page.
  if (filtered) metadata.alternates = { canonical: `/${options.locale}${canonicalPath}` };
  return metadata;
}
