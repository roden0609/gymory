import { HK_DISTRICTS } from "@gymory/shared";
import { describe, expect, it } from "vitest";

import {
  DISTRICT_PAGE_DEFINITIONS,
  getDistrictPageDefinition,
  getDistrictPageDefinitionByCode,
  getDistrictPageLabel,
} from "./district-pages";

describe("district page definitions", () => {
  it("creates exactly one definition for every Hong Kong district", () => {
    expect(DISTRICT_PAGE_DEFINITIONS).toHaveLength(HK_DISTRICTS.length);
    expect(DISTRICT_PAGE_DEFINITIONS.map(({ code }) => code)).toEqual(
      HK_DISTRICTS.map(({ code }) => code)
    );
  });

  it("generates stable slugs from English names", () => {
    const centralAndWestern = HK_DISTRICTS.find(
      ({ nameEn }) => nameEn === "Central & Western"
    );

    expect(
      getDistrictPageDefinitionByCode(centralAndWestern?.code ?? "")?.slug
    ).toBe("central-and-western");
  });

  it("looks up districts by slug and code", () => {
    const first = DISTRICT_PAGE_DEFINITIONS[0];
    expect(getDistrictPageDefinition(first.slug)).toBe(first);
    expect(getDistrictPageDefinitionByCode(first.code)).toBe(first);
  });

  it("returns null for unknown district values", () => {
    expect(getDistrictPageDefinition("unknown")).toBeNull();
    expect(getDistrictPageDefinitionByCode("UNKNOWN")).toBeNull();
  });

  it("selects the correct localized label", () => {
    const first = DISTRICT_PAGE_DEFINITIONS[0];
    expect(getDistrictPageLabel(first, "en")).toBe(first.nameEn);
    expect(getDistrictPageLabel(first, "zh-HK")).toBe(first.nameZh);
  });

  it("has unique codes and slugs", () => {
    const codes = DISTRICT_PAGE_DEFINITIONS.map(({ code }) => code);
    const slugs = DISTRICT_PAGE_DEFINITIONS.map(({ slug }) => slug);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
