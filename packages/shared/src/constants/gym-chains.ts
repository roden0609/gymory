export type GymChainOption = {
  slug: string;
  name_en: string;
  name_zh: string;
  slugPrefixes: string[];
};

export const GYM_CHAINS: GymChainOption[] = [
  {
    slug: "24-7-fitness",
    name_en: "24/7 Fitness",
    name_zh: "24/7 Fitness",
    slugPrefixes: ["24-7-fitness-"],
  },
  {
    slug: "efx24",
    name_en: "EFX24",
    name_zh: "EFX24",
    slugPrefixes: ["efx24-"],
  },
  {
    slug: "lcsd",
    name_en: "LCSD Fitness Rooms",
    name_zh: "康文署健身室",
    slugPrefixes: ["lcsd-"],
  },
  {
    slug: "go24-fitness",
    name_en: "GO24 Fitness",
    name_zh: "GO24 Fitness",
    slugPrefixes: ["go24-fitness-"],
  },
  {
    slug: "pure-fitness",
    name_en: "PURE Fitness",
    name_zh: "PURE Fitness",
    slugPrefixes: ["pure-fitness-"],
  },
  {
    slug: "snap-fitness",
    name_en: "Snap Fitness",
    name_zh: "Snap Fitness",
    slugPrefixes: ["snap-fitness-"],
  },
  {
    slug: "anytime-fitness",
    name_en: "Anytime Fitness",
    name_zh: "Anytime Fitness",
    slugPrefixes: ["anytime-fitness-"],
  },
];

export function getGymChainsBySlug(slugs: string[]) {
  const selected = new Set(slugs);
  return GYM_CHAINS.filter((chain) => selected.has(chain.slug));
}
