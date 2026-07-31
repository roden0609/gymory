import { describe, expect, it } from "vitest";

import {
  buildChangeComparison,
  isEqualJsonValue,
  mergeChangeComparisons,
  resolveChangeComparison,
} from "./submission-change-comparison";

describe("isEqualJsonValue", () => {
  it.each([
    [null, null, true],
    ["gym", "gym", true],
    [1, 2, false],
    [false, true, false],
    [[1, { nested: true }], [1, { nested: true }], true],
    [[1, 2], [2, 1], false],
    [{ a: 1, b: 2 }, { b: 2, a: 1 }, true],
    [{ a: 1 }, { a: 1, b: 2 }, false],
    [[], {}, false],
  ])("compares %j and %j as %s", (left, right, expected) => {
    expect(isEqualJsonValue(left, right)).toBe(expected);
  });
});

describe("buildChangeComparison", () => {
  it("returns only structurally changed fields", () => {
    expect(
      buildChangeComparison(
        { name: "Old", tags: ["strength"], meta: { verified: true } },
        {
          name: "New",
          tags: ["strength"],
          meta: { verified: true },
          district: "YTM",
        }
      )
    ).toEqual({
      name: { before: "Old", after: "New", beforeCaptured: true },
      district: { before: null, after: "YTM", beforeCaptured: true },
    });
  });

  it("returns an empty comparison without an after record", () => {
    expect(buildChangeComparison({ name: "Old" }, null)).toEqual({});
  });
});

describe("resolveChangeComparison", () => {
  it("prefers an existing valid comparison over other payload formats", () => {
    const changeComparison = {
      name: { before: "Original", after: "Reviewed" },
    };

    expect(
      resolveChangeComparison(
        {
          changeComparison,
          before: { name: "Before" },
          after: { name: "After" },
        },
        { name: "Legacy" }
      )
    ).toBe(changeComparison);
  });

  it("builds a comparison from before and after records", () => {
    expect(
      resolveChangeComparison(
        { before: { name: "Old" }, after: { name: "New" } },
        { name: "Legacy" }
      )
    ).toEqual({
      name: { before: "Old", after: "New", beforeCaptured: true },
    });
  });

  it("falls back to legacy changed fields without captured before values", () => {
    expect(resolveChangeComparison({}, { name: "New" })).toEqual({
      name: { before: null, after: "New", beforeCaptured: false },
    });
  });

  it("rejects malformed comparisons and falls back", () => {
    expect(
      resolveChangeComparison(
        { changeComparison: { name: { before: "Old" } } },
        { name: "Fallback" }
      )
    ).toEqual({
      name: { before: null, after: "Fallback", beforeCaptured: false },
    });
  });

  it("returns an empty comparison when no source is valid", () => {
    expect(resolveChangeComparison({}, null)).toEqual({});
  });
});

describe("mergeChangeComparisons", () => {
  it("ignores empty inputs and lets later entries override earlier ones", () => {
    expect(
      mergeChangeComparisons(
        { name: { before: "A", after: "B" } },
        null,
        { district: { before: "CW", after: "YTM" } },
        { name: { before: "B", after: "C" } }
      )
    ).toEqual({
      name: { before: "B", after: "C" },
      district: { before: "CW", after: "YTM" },
    });
  });
});
