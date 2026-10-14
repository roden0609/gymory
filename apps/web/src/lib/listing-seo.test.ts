import { describe, expect, it } from "vitest";
import { buildListingSeoMetadata, getListingSeoState } from "./listing-seo";

const metadata = (path: string, searchParams = {}, empty = false) => buildListingSeoMetadata({
  locale: "zh-HK", path, title: "Title", description: "Description", searchParams, empty,
});

describe("listing index rules", () => {
  it.each(["/search", "/districts/yau-tsim-mong", "/gym-brands/anytime-fitness", "/powerlifting-hong-kong"])("keeps unfiltered %s indexable", (path) => {
    expect(metadata(path).robots).toBeUndefined();
    expect(metadata(path).alternates?.canonical).toBe(`/zh-HK${path}`);
  });

  it.each([
    { districts: "wan-chai,yau-tsim-mong" },
    { gymChains: "anytime-fitness,snap-fitness" },
    { machine: "hack squat" },
    { minRackCount: "2" },
    { userLat: "22.3", userLng: "114.1" },
  ])("noindexes filters with a canonical for their own results: %j", (searchParams) => {
    const result = metadata("/search", searchParams);
    expect(result.robots).toEqual({ index: false, follow: true });
    expect(result.alternates?.canonical).toMatch(/^\/zh-HK\/search\?/);
    expect(result.alternates?.languages).toBeUndefined();
  });

  it("noindexes district, brand and training pages with additional filters", () => {
    for (const path of ["/districts/wan-chai", "/gym-brands/anytime-fitness", "/powerlifting-hong-kong"]) {
      expect(metadata(path, { minRackCount: "2" }).robots).toEqual({ index: false, follow: true });
    }
  });

  it("removes display and tracking parameters and keeps distinct pagination canonicals", () => {
    expect(getListingSeoState("/districts/wan-chai", { view: "map", flash: "success", utm_source: "test", page: "1" }))
      .toEqual({ filtered: false, canonicalPath: "/districts/wan-chai" });
    expect(metadata("/gym-brands/anytime-fitness", { page: "2", pageSize: "20", view: "split" }).alternates?.canonical)
      .toBe("/zh-HK/gym-brands/anytime-fitness?page=2&pageSize=20");
  });

  it("noindexes empty landing pages", () => {
    expect(metadata("/gym-brands/anytime-fitness", {}, true).robots).toEqual({ index: false, follow: true });
  });
});
