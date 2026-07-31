import { describe, expect, it } from "vitest";

import { toSlug } from "./slug";

describe("toSlug", () => {
  it.each([
    ["  My New Gym  ", "my-new-gym"],
    ["Power---Rack", "power-rack"],
    ["Gym! @ Central", "gym-central"],
    ["already-valid", "already-valid"],
    ["", ""],
    ["!!!", ""],
    ["香港健身室", ""],
  ])("converts %j to %j", (input, expected) => {
    expect(toSlug(input)).toBe(expected);
  });
});
