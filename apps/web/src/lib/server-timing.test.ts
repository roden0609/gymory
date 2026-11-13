import { afterEach, describe, expect, it, vi } from "vitest";

// Next.js supplies React cache in its Server Component runtime.
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
import { withServerTiming } from "./server-timing";

afterEach(() => vi.restoreAllMocks());

describe("server timing logs", () => {
  it("returns the original result and logs accumulated timings without result data", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const privateResult = { source_url: "private-source", lat: 22.3, token: "private-token" };
    const result = await withServerTiming("gym_search_timing", async (timing) => {
      await timing.measure("gym_query_ms", async () => { now += 10; });
      await timing.measure("gym_query_ms", async () => { now += 20; });
      timing.record("returned_gyms", 1);
      timing.record("matched_gyms", Number.NaN);
      return privateResult;
    });
    expect(result).toBe(privateResult);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      event: "gym_search_timing", requestId: expect.any(String), status: "ok",
      gym_query_ms: 30, returned_gyms: 1, total_ms: 30,
    });
    expect(log.mock.calls[0][0]).not.toContain("private");
  });

  it("logs failed phase duration and propagates the original error without logging its message", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = new Error("credential-or-private-query");
    await expect(withServerTiming("gym_search_timing", (timing) =>
      timing.measure("gym_query_ms", async () => { throw error; })
    )).rejects.toBe(error);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      status: "error", gym_query_ms: expect.any(Number), total_ms: expect.any(Number),
    });
    expect(log.mock.calls[0][0]).not.toContain(error.message);
  });
});
