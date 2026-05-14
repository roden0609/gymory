import { HK_DISTRICTS, type HkDistrictCode } from "@gymory/shared";

export type DistrictPageDefinition = {
  code: HkDistrictCode;
  slug: string;
  nameEn: string;
  nameZh: string;
};

export const DISTRICT_PAGE_DEFINITIONS: DistrictPageDefinition[] =
  HK_DISTRICTS.map((district) => ({
    code: district.code,
    slug: district.nameEn.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-"),
    nameEn: district.nameEn,
    nameZh: district.nameZh,
  }));

export function getDistrictPageDefinition(slug: string) {
  return DISTRICT_PAGE_DEFINITIONS.find((district) => district.slug === slug) ?? null;
}

export function getDistrictPageDefinitionByCode(code: string) {
  return DISTRICT_PAGE_DEFINITIONS.find((district) => district.code === code) ?? null;
}

export function getDistrictPageLabel(
  district: DistrictPageDefinition,
  locale: "en" | "zh-HK"
) {
  return locale === "zh-HK" ? district.nameZh : district.nameEn;
}
