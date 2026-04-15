// Hong Kong 18 districts
export const HK_DISTRICTS = [
  // Hong Kong Island
  "Central & Western",
  "Wan Chai",
  "Eastern",
  "Southern",
  // Kowloon
  "Yau Tsim Mong",
  "Sham Shui Po",
  "Kowloon City",
  "Wong Tai Sin",
  "Kwun Tong",
  // New Territories
  "Kwai Tsing",
  "Tsuen Wan",
  "Tuen Mun",
  "Yuen Long",
  "North",
  "Tai Po",
  "Sha Tin",
  "Sai Kung",
  "Islands",
] as const;

export type HkDistrict = (typeof HK_DISTRICTS)[number];
