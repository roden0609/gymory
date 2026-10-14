import { describe, expect, it } from "vitest";
import type { GymSummary } from "@gymory/shared";
import { getGymBrandForGym, getIndexableGymBrandSlugs, summarizeGymBrand } from "./gym-brand-pages";

describe("gym brand page data", () => {
  it("uses the same prefix matching as brand search, including LCSD rooms", () => {
    expect(getGymBrandForGym("anytime-fitness-wan-chai")?.slug).toBe("anytime-fitness");
    expect(getGymBrandForGym("lcsd-foo")?.slug).toBe("lcsd");
    expect(getGymBrandForGym("independent-gym")).toBeNull();
  });

  it("only adds brands with actual recorded gyms to the sitemap", () => {
    expect(getIndexableGymBrandSlugs([{ slug: "snap-fitness-a" }, { slug: "snap-fitness-b" }, { slug: "independent-gym" }])).toEqual(["snap-fitness"]);
    expect(getIndexableGymBrandSlugs([])).toEqual([]);
  });

  it("counts districts and positive recorded features without treating unknown data as available", () => {
    const gyms = [
      { district_code: "HK-WC", rack_count: 2, dumbbell_max_weight_kg: 30, has_bathroom: true },
      { district_code: "HK-WC", rack_count: 0, dumbbell_max_weight_kg: null, has_bathroom: null },
      { district_code: "HK-YTM", rack_count: null, dumbbell_max_weight_kg: 20, has_bathroom: false },
    ] as GymSummary[];
    const overview = summarizeGymBrand(gyms);
    expect(overview.totalCount).toBe(3);
    expect(overview.districts.map((d) => [d.code, d.count])).toEqual([["HK-WC", 2], ["HK-YTM", 1]]);
    expect(overview.features).toEqual([{ key: "racks", count: 1 }, { key: "dumbbells", count: 2 }, { key: "bathrooms", count: 1 }]);
  });
});
