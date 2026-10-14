import { describe, expect, it } from "vitest";
import { getSearchBrowseHref, getSelectedDistricts } from "./search-navigation";

const browse = (districtSlugs: string[], gymChainSlugs: string[] = [], query = "", trainingSlug?: string) =>
  getSearchBrowseHref({ params: new URLSearchParams(query), districtSlugs, gymChainSlugs, trainingSlug });

describe("district and gym brand browsing", () => {
  it("uses landing pages for one district or one gym brand", () => {
    expect(browse(["yau-tsim-mong"])).toBe("/districts/yau-tsim-mong");
    expect(browse([], ["anytime-fitness"])).toBe("/gym-brands/anytime-fitness");
    expect(browse([])).toBe("/search");
  });

  it("keeps multi-district OR selections stable, unique, and shareable", () => {
    const url = browse(["yau-tsim-mong", "wan-chai", "yau-tsim-mong"], ["snap-fitness", "anytime-fitness"], "minRackCount=2&machine=hack+squat&view=split&userLat=22.3&userLng=114.1&page=3&pageSize=20");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(url.startsWith("/search?")).toBe(true);
    expect(params.get("districts")).toBe("wan-chai,yau-tsim-mong");
    expect(params.get("gymChains")).toBe("snap-fitness,anytime-fitness");
    expect(params.get("minRackCount")).toBe("2");
    expect(params.get("machine")).toBe("hack squat");
    expect(params.get("view")).toBe("split");
    expect(params.get("userLat")).toBe("22.3");
    expect(params.has("page")).toBe(false);
    expect(params.has("pageSize")).toBe(false);
  });

  it("returns from multiple districts to a single district without losing the brand", () => {
    expect(browse(["wan-chai"], ["anytime-fitness"], "districts=wan-chai,yau-tsim-mong&minRackCount=2"))
      .toBe("/districts/wan-chai?gymChains=anytime-fitness&minRackCount=2");
  });

  it("returns from multiple brands to a brand landing page and retains filters", () => {
    expect(browse([], ["anytime-fitness"], "gymChains=anytime-fitness,snap-fitness&category=legs"))
      .toBe("/gym-brands/anytime-fitness?category=legs");
  });

  it("preserves a training collection when moving between one and several districts", () => {
    const training = "powerlifting-hong-kong";
    expect(browse(["wan-chai"], [], "", training)).toBe(`/${training}/districts/wan-chai`);
    expect(browse([], [], "", training)).toBe(`/${training}`);
    expect(browse(["wan-chai", "yau-tsim-mong"], [], "", training)).toBe(`/search?collection=${training}&districts=wan-chai%2Cyau-tsim-mong`);
    expect(browse(["wan-chai"], [], `collection=${training}&districts=wan-chai,yau-tsim-mong`)).toBe(`/${training}/districts/wan-chai`);
  });

  it("recognizes legacy district codes, public slugs and fixed landing-page context", () => {
    expect(getSelectedDistricts(new URLSearchParams("district=HK-YTM")).map((d) => d.slug)).toEqual(["yau-tsim-mong"]);
    expect(getSelectedDistricts(new URLSearchParams("districts=wan-chai,HK-YTM,unknown,wan-chai")).map((d) => d.code)).toEqual(["HK-WC", "HK-YTM"]);
    expect(getSelectedDistricts(new URLSearchParams("districts=wan-chai"), "HK-YTM").map((d) => d.slug)).toEqual(["yau-tsim-mong"]);
  });
});
