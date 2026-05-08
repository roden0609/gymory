export type EquipmentBrandOption = {
  slug: string;
  name_en: string;
  name_zh: string | null;
  country: string | null;
};

export const EQUIPMENT_BRANDS: EquipmentBrandOption[] = [
  { slug: "technogym", name_en: "Technogym", name_zh: "Technogym", country: "Italy" },
  { slug: "life-fitness", name_en: "Life Fitness", name_zh: "Life Fitness", country: "United States" },
  { slug: "precor", name_en: "Precor", name_zh: "Precor", country: "United States" },
  { slug: "matrix-fitness", name_en: "Matrix Fitness", name_zh: "Matrix Fitness", country: "Taiwan" },
  { slug: "hammer-strength", name_en: "Hammer Strength", name_zh: "Hammer Strength", country: "United States" },
  { slug: "rogue-fitness", name_en: "Rogue Fitness", name_zh: "Rogue Fitness", country: "United States" },
  { slug: "eleiko", name_en: "Eleiko", name_zh: "Eleiko", country: "Sweden" },
  { slug: "ivanko", name_en: "Ivanko", name_zh: "Ivanko", country: "United States" },
  { slug: "panatta", name_en: "Panatta", name_zh: "Panatta", country: "Italy" },
  { slug: "cybex", name_en: "Cybex", name_zh: "Cybex", country: "United States" },
  { slug: "nautilus", name_en: "Nautilus", name_zh: "Nautilus", country: "United States" },
  { slug: "hoist-fitness", name_en: "Hoist Fitness", name_zh: "Hoist Fitness", country: "United States" },
  { slug: "woodway", name_en: "Woodway", name_zh: "Woodway", country: "United States" },
  { slug: "assault-fitness", name_en: "Assault Fitness", name_zh: "Assault Fitness", country: "United States" },
  { slug: "concept2", name_en: "Concept2", name_zh: "Concept2", country: "United States" },
  { slug: "schwinn", name_en: "Schwinn", name_zh: "Schwinn", country: "United States" },
  { slug: "again-faster", name_en: "Again Faster", name_zh: "Again Faster", country: "United States" },
  { slug: "trx", name_en: "TRX", name_zh: "TRX", country: "United States" },
  { slug: "escape-fitness", name_en: "Escape Fitness", name_zh: "Escape Fitness", country: "United Kingdom" },
  { slug: "harbinger", name_en: "Harbinger", name_zh: "Harbinger", country: "United States" },
  { slug: "schiek", name_en: "Schiek", name_zh: "Schiek", country: "United States" },
  { slug: "bear-komplex", name_en: "Bear KompleX", name_zh: "Bear KompleX", country: "United States" },
  { slug: "gymreapers", name_en: "Gymreapers", name_zh: "Gymreapers", country: "United States" },
  { slug: "impulse-fitness", name_en: "Impulse Fitness", name_zh: "Impulse Fitness", country: "China" },
  { slug: "dhz-fitness", name_en: "DHZ Fitness", name_zh: "DHZ Fitness", country: "China" },
  { slug: "shua-fitness", name_en: "Shua Fitness", name_zh: "Shua Fitness", country: "China" },
  { slug: "luxiaojun-fitness", name_en: "LUXIAOJUN Fitness", name_zh: "LUXIAOJUN Fitness", country: "China" },
  { slug: "sportsart", name_en: "SportsArt", name_zh: "SportsArt", country: "Taiwan" },
  { slug: "newtech-wellness", name_en: "Newtech Wellness", name_zh: "Newtech Wellness", country: "South Korea" },
  { slug: "xmaster-fitness", name_en: "XMaster Fitness", name_zh: "XMaster Fitness", country: "China" },
  { slug: "booty-builder", name_en: "Booty Builder", name_zh: "Booty Builder", country: "Norway" },
];
