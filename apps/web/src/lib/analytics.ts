export type AnalyticsParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export type ResultClickSource =
  | "search_results"
  | "equipment_page"
  | "district_page"
  | "brand_page"
  | "unknown";

export type ExternalGymLinkType =
  | "official_website"
  | "instagram"
  | "facebook"
  | "booking"
  | "other";

export type FilterEventSource =
  | "search_page"
  | "gym_list"
  | "equipment_page"
  | "unknown";

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: AnalyticsParams
    ) => void;
  }
}

function withoutUndefined(params?: AnalyticsParams) {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  ) as AnalyticsParams;
}

function hasAnalyticsOptOutCookie() {
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .includes("gymory_no_ga=1");
}

export function trackEvent(eventName: string, params?: AnalyticsParams) {
  if (typeof window === "undefined") return;
  if (hasAnalyticsOptOutCookie()) return;
  if (!window.gtag) return;

  window.gtag("event", eventName, withoutUndefined(params));
}

export function trackSearch(
  searchTerm: string,
  source: "homepage" | "search_page" | "navbar" | "unknown" = "unknown"
) {
  const trimmedTerm = searchTerm.trim();
  if (!trimmedTerm) return;

  trackEvent("search", {
    search_term: trimmedTerm,
    source,
  });
}

export function trackEquipmentFilter(params: {
  equipment: string;
  filter_param?: string;
  selected: boolean;
  source?: FilterEventSource;
}) {
  trackEvent("equipment_filter", {
    ...params,
    source: params.source ?? "unknown",
  });
}

export function trackGymBrandFilter(params: {
  gym_chain: string;
  filter_param?: string;
  selected: boolean;
  source?: FilterEventSource;
}) {
  trackEvent("gym_brand_filter", {
    ...params,
    source: params.source ?? "unknown",
  });
}

export function trackEquipmentBrandFilter(params: {
  equipment_brand: string;
  filter_param?: string;
  selected: boolean;
  source?: FilterEventSource;
}) {
  trackEvent("equipment_brand_filter", {
    ...params,
    source: params.source ?? "unknown",
  });
}

export function trackDistrictFilter(params: {
  district: string;
  filter_param?: string;
  selected: boolean;
  source?: FilterEventSource;
}) {
  trackEvent("district_filter", {
    ...params,
    source: params.source ?? "unknown",
  });
}

export function trackFilterApply(params: {
  filter_param: string;
  filter_value?: string | number | boolean | null;
  selected?: boolean;
  source?: FilterEventSource;
}) {
  trackEvent("filter_apply", {
    ...params,
    source: params.source ?? "unknown",
  });
}

export function trackResultClick(params: {
  gym_slug: string;
  gym_name?: string;
  result_position?: number;
  source?: ResultClickSource;
}) {
  trackEvent("search_result_click", {
    ...params,
    source: params.source ?? "unknown",
  });
}

export function trackGymView(params: {
  gym_slug: string;
  gym_name?: string;
  district?: string;
  chain?: string;
  locale?: string;
}) {
  trackEvent("view_gym", params);
}

export function trackEquipmentView(params: {
  equipment: string;
  locale?: string;
}) {
  trackEvent("view_equipment", params);
}

export function trackTrainingCollectionView(params: {
  training_collection: string;
  district?: string;
  locale?: string;
}) {
  trackEvent("view_training_collection", params);
}

export function trackSubmissionSuccess(params: {
  submission_type: "add_gym" | "edit_equipment" | "correction" | "unknown";
  gym_slug?: string;
  locale?: string;
}) {
  trackEvent("submit_gym_success", params);
}

export function trackOpenGoogleMaps(params: {
  gym_slug: string;
  gym_name?: string;
  district?: string;
}) {
  trackEvent("open_google_maps", params);
}

export function trackVisitGymWebsite(params: {
  gym_slug: string;
  gym_name?: string;
  link_type: ExternalGymLinkType;
}) {
  trackEvent("visit_gym_website", params);
}
