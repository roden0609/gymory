import { describe, expect, it } from "vitest";

import { inferDistrictFromSources } from "../../../scripts/lib/district-inference.mjs";

const districts = [
  { code: "HK-CW", keywords: ["central", "sai wan", "西環"] },
  { code: "HK-EA", keywords: ["sai wan ho", "siu sai wan", "西灣河", "小西灣"] },
  { code: "HK-KTQ", keywords: ["kwai fong"] },
  { code: "HK-SK", keywords: ["tseung kwan o", "將軍澳"] },
];

describe("district inference", () => {
  it("prefers structured district data and addresses over a conflicting name", () => {
    expect(inferDistrictFromSources({
      structured: ["Tseung Kwan O"],
      addresses: ["Shop 204, Park Central"],
      fallback: ["Central Training Club"],
      districts,
    })).toBe("HK-SK");
  });

  it("prefers the most specific district phrase within an address", () => {
    expect(inferDistrictFromSources({
      addresses: ["52 Lei King Road, Sai Wan Ho 西灣河"],
      districts,
    })).toBe("HK-EA");
  });

  it("does not interpret Lan Kwai Fong as Kwai Fong", () => {
    expect(inferDistrictFromSources({
      addresses: ["California Tower, Lan Kwai Fong, Central"],
      districts,
    })).toBe("HK-CW");
  });

  it("uses a specific branch name to disambiguate a road named after another district", () => {
    expect(inferDistrictFromSources({
      addresses: ["No. 1 Lai Chi Kok Road, Kowloon"],
      fallback: ["Prince Edward"],
      districts: [
        { code: "HK-YTM", keywords: ["prince edward"] },
        { code: "HK-SSP", keywords: ["lai chi kok"] },
      ],
    })).toBe("HK-YTM");
  });
});
