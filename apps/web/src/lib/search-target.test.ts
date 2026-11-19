import { describe, expect, it } from "vitest";
import { getSearchTarget } from "./search-target";

describe("pending search navigation targets", () => {
  it("identifies implicit district and training filters before the destination page arrives", () => {
    expect(getSearchTarget("/powerlifting-hong-kong/districts/yau-tsim-mong?category=free-weight")).toMatchObject({
      pathname: "/powerlifting-hong-kong/districts/yau-tsim-mong",
      district: "HK-YTM", collection: "powerlifting-hong-kong", query: "category=free-weight",
    });
  });
  it("clears fixed district context when selecting several districts", () => {
    expect(getSearchTarget("/search?districts=wan-chai,yau-tsim-mong")).toMatchObject({ district: undefined, gymChain: undefined, collection: undefined });
  });
  it("retains fixed brand context on a pending brand landing page", () => {
    expect(getSearchTarget("/gym-brands/24-7-fitness?hasRower=true")).toMatchObject({ gymChain: "24-7-fitness", district: undefined });
  });
  it("uses the same identity for equivalent query parameter orders", () => {
    expect(getSearchTarget("/search?category=free-weight&hasRower=true").key).toBe(getSearchTarget("/search?hasRower=true&category=free-weight").key);
  });
});
