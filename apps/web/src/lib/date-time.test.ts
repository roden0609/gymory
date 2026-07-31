import { describe, expect, it } from "vitest";

import { formatHongKongDateTime } from "./date-time";

describe("formatHongKongDateTime", () => {
  it("converts a UTC timestamp to Hong Kong time", () => {
    expect(formatHongKongDateTime("2026-08-01T12:00:00.000Z", "en")).toBe(
      "Aug 1, 2026, 8:00 PM HKT"
    );
  });

  it("uses the requested locale while keeping the HKT timezone explicit", () => {
    const formatted = formatHongKongDateTime(
      "2026-08-01T16:30:00.000Z",
      "zh-HK"
    );

    expect(formatted).toContain("2026年8月2日");
    expect(formatted).toContain("上午12:30");
    expect(formatted.endsWith(" HKT")).toBe(true);
  });
});
