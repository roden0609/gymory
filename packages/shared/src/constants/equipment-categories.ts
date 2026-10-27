export const EQUIPMENT_CATEGORIES = [
  { code: "free_weight", slug: "free-weight", name: "Free weight", nameZh: "自由重量", section: "freeWeight" },
  { code: "cardio", slug: "cardio", name: "Cardio", nameZh: "帶氧運動", section: "cardio" },
  { code: "cable", slug: "cable", name: "Cable", nameZh: "滑輪器械", section: "cable" },
  { code: "full_body", slug: "full-body", name: "Full body", nameZh: "全身器械", section: "fullBodyMachine" },
  { code: "core", slug: "core", name: "Core", nameZh: "核心", section: "coreMachine" },
  { code: "arm", slug: "arm", name: "Arm", nameZh: "手臂", section: "armMachine" },
  { code: "chest", slug: "chest", name: "Chest", nameZh: "胸部", section: "chestMachine" },
  { code: "back", slug: "back", name: "Back", nameZh: "背部", section: "backMachine" },
  { code: "shoulder", slug: "shoulder", name: "Shoulder", nameZh: "肩部", section: "shoulderMachine" },
  { code: "leg", slug: "leg", name: "Leg", nameZh: "腿部", section: "legMachine" },
  // Glute reports use the existing lower-body submission section.
  { code: "glute", slug: "glute", name: "Glute", nameZh: "臀部", section: "legMachine" },
  { code: "functional_training", slug: "functional-training", name: "Functional training", nameZh: "功能性訓練", section: "functionalTraining" },
  { code: "other", slug: "other", name: "Other", nameZh: "其他器材", section: "otherEquipment" },
] as const;

export const EQUIPMENT_LABELS = ["plate-loaded", "selectorized", "hyrox"] as const;
export type EquipmentLabel = (typeof EQUIPMENT_LABELS)[number];

export function getEquipmentLabel(label: string, locale: string) {
  const names: Record<string, [string, string]> = {
    "plate-loaded": ["Plate Loaded", "槓片式"],
    selectorized: ["Selectorized", "插銷式"],
    hyrox: ["HYROX", "HYROX"],
  };
  return names[label]?.[locale === "zh-HK" ? 1 : 0] ?? label;
}
