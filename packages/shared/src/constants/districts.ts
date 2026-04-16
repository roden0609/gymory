// Hong Kong 18 districts. Codes are stable DB values; labels are display-only.
export const HK_DISTRICTS = [
  { code: "HK-CW", nameEn: "Central & Western", nameZh: "中西區" },
  { code: "HK-WC", nameEn: "Wan Chai", nameZh: "灣仔" },
  { code: "HK-EA", nameEn: "Eastern", nameZh: "東區" },
  { code: "HK-SO", nameEn: "Southern", nameZh: "南區" },
  { code: "HK-YTM", nameEn: "Yau Tsim Mong", nameZh: "油尖旺" },
  { code: "HK-SSP", nameEn: "Sham Shui Po", nameZh: "深水埗" },
  { code: "HK-KC", nameEn: "Kowloon City", nameZh: "九龍城" },
  { code: "HK-WTS", nameEn: "Wong Tai Sin", nameZh: "黃大仙" },
  { code: "HK-KT", nameEn: "Kwun Tong", nameZh: "觀塘" },
  { code: "HK-KTQ", nameEn: "Kwai Tsing", nameZh: "葵青" },
  { code: "HK-TW", nameEn: "Tsuen Wan", nameZh: "荃灣" },
  { code: "HK-TM", nameEn: "Tuen Mun", nameZh: "屯門" },
  { code: "HK-YL", nameEn: "Yuen Long", nameZh: "元朗" },
  { code: "HK-N", nameEn: "North", nameZh: "北區" },
  { code: "HK-TP", nameEn: "Tai Po", nameZh: "大埔" },
  { code: "HK-ST", nameEn: "Sha Tin", nameZh: "沙田" },
  { code: "HK-SK", nameEn: "Sai Kung", nameZh: "西貢" },
  { code: "HK-IS", nameEn: "Islands", nameZh: "離島" },
] as const;

export type HkDistrict = (typeof HK_DISTRICTS)[number];
export type HkDistrictCode = HkDistrict["code"];

export function getHkDistrictLabel(
  code: string,
  locale: "en" | "zh-HK" = "en"
) {
  const district = HK_DISTRICTS.find((item) => item.code === code);
  if (!district) return code;
  return locale === "zh-HK" ? district.nameZh : district.nameEn;
}
