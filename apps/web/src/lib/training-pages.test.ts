import type { GymSummary } from "@gymory/shared";
import { describe, expect, it } from "vitest";

import {
  TRAINING_PAGE_DEFINITIONS,
  getTrainingPageDefinition,
  getTrainingSearchQuery,
} from "./training-pages";

function buildGym(overrides: Partial<GymSummary> = {}): GymSummary {
  return {
    id: "gym-id",
    name: "Test Gym",
    name_zh: null,
    slug: "test-gym",
    district_code: "YTM",
    address: null,
    address_zh: null,
    lat: null,
    lng: null,
    size_category: null,
    ...overrides,
  } as GymSummary;
}

function definition(slug: string) {
  const result = getTrainingPageDefinition(slug);
  if (!result) throw new Error(`Missing training definition: ${slug}`);
  return result;
}

const hyroxFriendlyCounts = {
  assault_runner_count: 1,
  ski_erg_count: 1,
  sled_count: 1,
  rower_count: 1,
  wall_ball_4kg_count: 1,
  wall_ball_6kg_count: 1,
  sandbag_10kg_count: 1,
  sandbag_20kg_count: 1,
  kettlebell_16kg_count: 1,
  kettlebell_24kg_count: 1,
} satisfies Partial<GymSummary>;

describe("training page definition lookup", () => {
  it.each(TRAINING_PAGE_DEFINITIONS)(
    "resolves $slug and generates its own collection query",
    (item) => {
      expect(getTrainingPageDefinition(item.slug)).toBe(item);
      expect(getTrainingSearchQuery(item)).toBe(
        new URLSearchParams({ collection: item.slug }).toString()
      );
    }
  );

  it("returns null for an unknown slug", () => {
    expect(getTrainingPageDefinition("unknown")).toBeNull();
  });

  it("has unique, complete definitions", () => {
    const slugs = TRAINING_PAGE_DEFINITIONS.map(({ slug }) => slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const item of TRAINING_PAGE_DEFINITIONS) {
      expect(item.slug).not.toBe("");
      expect(item.orFilter).not.toBe("");
      expect(item.equipmentLinks.every(Boolean)).toBe(true);
    }
  });
});

describe("HYROX collection rules", () => {
  it("matches HYROX official only when the official flag is true", () => {
    const official = definition("hyrox-official-hong-kong");
    expect(official.matchesGym(buildGym({ is_hyrox_official: true }))).toBe(
      true
    );
    expect(official.matchesGym(buildGym({ is_hyrox_official: false }))).toBe(
      false
    );
  });

  it("requires every HYROX-friendly equipment count to be positive", () => {
    const friendly = definition("hyrox-friendly-hong-kong");
    expect(friendly.matchesGym(buildGym(hyroxFriendlyCounts))).toBe(true);

    expect(
      friendly.matchesGym(
        buildGym({ ...hyroxFriendlyCounts, kettlebell_24kg_count: 0 })
      )
    ).toBe(false);
    expect(
      friendly.matchesGym(
        buildGym({ ...hyroxFriendlyCounts, kettlebell_24kg_count: null })
      )
    ).toBe(false);
  });

  it("emits only positive HYROX signals and preserves counts", () => {
    const friendly = definition("hyrox-friendly-hong-kong");
    expect(
      friendly.getSignals(
        buildGym({
          ski_erg_count: 2,
          sled_count: 0,
          rower_count: null,
        })
      )
    ).toEqual([{ labelKey: "skiErg", count: 2 }]);
  });
});

describe("strength collection rules", () => {
  it("requires platforms, barbells, and plate data for Olympic lifting", () => {
    const olympic = definition("olympic-lifting-hong-kong");
    const valid = {
      platform_count: 1,
      barbell_count: 1,
      plate_min_weight_kg: 1.25,
    } satisfies Partial<GymSummary>;

    expect(olympic.matchesGym(buildGym(valid))).toBe(true);
    expect(
      olympic.matchesGym(buildGym({ ...valid, platform_count: 0 }))
    ).toBe(false);
    expect(
      olympic.matchesGym(
        buildGym({
          platform_count: 1,
          barbell_count: 1,
          plate_min_weight_kg: null,
          plate_max_weight_kg: null,
        })
      )
    ).toBe(false);
  });

  it("accepts either minimum or maximum plate data for powerlifting", () => {
    const powerlifting = definition("powerlifting-hong-kong");
    const base = { rack_count: 1, barbell_count: 1 };

    expect(
      powerlifting.matchesGym(
        buildGym({ ...base, plate_max_weight_kg: 25 })
      )
    ).toBe(true);
    expect(
      powerlifting.matchesGym(
        buildGym({
          ...base,
          plate_min_weight_kg: null,
          plate_max_weight_kg: null,
        })
      )
    ).toBe(false);
    expect(
      powerlifting.matchesGym(
        buildGym({ ...base, rack_count: 0, plate_max_weight_kg: 25 })
      )
    ).toBe(false);
  });
});

describe("bodybuilding collection rules", () => {
  const groups: Array<Array<keyof GymSummary>> = [
    [
      "has_chest_press_machine",
      "has_incline_chest_press_machine",
      "has_decline_chest_press_machine",
    ],
    [
      "has_lat_pulldown_machine",
      "has_seated_row_machine",
      "has_back_extension_machine",
    ],
    [
      "has_overhead_chair",
      "has_lateral_raise_machine",
      "has_reverse_fly_machine",
    ],
    [
      "has_hip_abductor_machine",
      "has_leg_press_machine",
      "has_hack_squat",
    ],
  ];

  function withCounts(counts: number[]) {
    const values: Partial<GymSummary> = {};
    groups.forEach((fields, groupIndex) => {
      fields.forEach((field, fieldIndex) => {
        Object.assign(values, {
          [field]: fieldIndex < counts[groupIndex],
        });
      });
    });
    return buildGym(values);
  }

  it("matches when every equipment group reaches its threshold", () => {
    expect(
      definition("bodybuilding-hong-kong").matchesGym(withCounts([2, 2, 2, 2]))
    ).toBe(true);
  });

  it.each([0, 1, 2, 3])(
    "rejects a gym immediately below the threshold in group %s",
    (groupIndex) => {
      const counts = [2, 2, 2, 2];
      counts[groupIndex] = 1;
      expect(
        definition("bodybuilding-hong-kong").matchesGym(withCounts(counts))
      ).toBe(false);
    }
  );

  it.each([0, 1, 2, 3])(
    "accepts a gym above the threshold in group %s",
    (groupIndex) => {
      const counts = [2, 2, 2, 2];
      counts[groupIndex] = 3;
      expect(
        definition("bodybuilding-hong-kong").matchesGym(withCounts(counts))
      ).toBe(true);
    }
  );
});

describe("hybrid training collection rules", () => {
  const hybrid = definition("hybrid-training-hong-kong");

  it("accepts valid alternatives from both strength and conditioning groups", () => {
    expect(
      hybrid.matchesGym(
        buildGym({
          has_plyo_box: true,
          rack_count: 1,
          ski_erg_count: 1,
        })
      )
    ).toBe(true);
    expect(
      hybrid.matchesGym(
        buildGym({
          has_plyo_box: true,
          barbell_count: 1,
          treadmill_count: 1,
        })
      )
    ).toBe(true);
  });

  it.each([
    { rack_count: 1, ski_erg_count: 1 },
    { has_plyo_box: true, ski_erg_count: 1 },
    { has_plyo_box: true, rack_count: 1 },
  ])("rejects a gym missing a required group: %j", (partial) => {
    expect(hybrid.matchesGym(buildGym(partial))).toBe(false);
  });

  it("emits boolean and positive count signals without unrelated values", () => {
    expect(
      hybrid.getSignals(
        buildGym({
          has_plyo_box: true,
          rack_count: 2,
          sled_count: 0,
          has_kettlebell: true,
        })
      )
    ).toEqual([
      { labelKey: "plyoBox" },
      { labelKey: "racks", count: 2 },
      { labelKey: "kettlebells" },
    ]);
  });
});
