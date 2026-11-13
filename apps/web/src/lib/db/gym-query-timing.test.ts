import { afterEach, expect, it, vi } from "vitest";
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
import { createServerClient } from "@supabase/ssr";
import { withServerTiming } from "../server-timing";
import { createGymQueryTiming } from "./gym-query-timing";

afterEach(() => vi.restoreAllMocks());

it("separates headers, one body read and SDK remainder across sequential batches without logging private data", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const body = JSON.stringify([{ name: "中文", source_url: "private-result" }]);
  const readText = vi.fn(async () => { now += 30; return body; });
  const fetcher = vi.fn(async () => {
    now += 20;
    const response = new Response(null, { headers: { "Content-Range": "0-0/1" } });
    response.text = readText;
    return response;
  });
  await withServerTiming("gym_search_timing", async (timing) => {
    const network = createGymQueryTiming(timing, fetcher);
    for (let i = 0; i < 2; i++) {
      const result = await network.measure(async () => {
        const response = await network.fetch("https://example.invalid/rest/v1/gym_search_public?private=filter", { headers: { Authorization: "Bearer private-token" } });
        expect(response.headers.get("Content-Range")).toBe("0-0/1");
        const text = await response.text();
        now += 5;
        return JSON.parse(text);
      });
      expect(result).toEqual(JSON.parse(body));
    }
  });
  expect(readText).toHaveBeenCalledTimes(2);
  expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
    gym_fetch_headers_ms: 40, gym_fetch_body_ms: 60,
    gym_sdk_overhead_ms: 10, gym_fetch_body_bytes: Buffer.byteLength(body) * 2,
    gym_fetch_requests: 2, gym_fetch_failures: 0, status: "ok",
  });
  expect(log.mock.calls[0][0]).not.toMatch(/private|Authorization|中文|example/);
});

it("preserves transport rejection and logs elapsed headers wait", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const error = new Error("private-network-error");
  await expect(withServerTiming("gym_search_timing", (timing) => {
    const network = createGymQueryTiming(timing, async () => { throw error; });
    return network.measure(() => network.fetch("https://example.invalid/rest/v1/gym_search_public"));
  })).rejects.toBe(error);
  expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ status: "error", gym_fetch_failures: 1, gym_fetch_requests: 1, gym_fetch_body_bytes: 0 });
  expect(log.mock.calls[0][0]).not.toContain(error.message);
});

it("works with the installed PostgREST SDK and retains exact counts and HTTP error handling", async () => {
  const record = vi.fn();
  const timing = { record, measure: vi.fn() };
  const fetcher = vi.fn()
    .mockResolvedValueOnce(new Response('[{"id":"gym"}]', { headers: { "Content-Type": "application/json", "Content-Range": "0-0/17" } }))
    .mockResolvedValueOnce(new Response('{"code":"57014","message":"private-query-error"}', { status: 500 }));
  const network = createGymQueryTiming(timing, fetcher);
  const client = createServerClient("https://example.invalid", "test-public-key", {
    cookies: { getAll: () => [], setAll() {} }, global: { fetch: network.fetch },
  });
  const result = await network.measure(() => client.from("gym_search_public").select("id", { count: "exact" }));
  expect(result.data).toEqual([{ id: "gym" }]);
  expect(result.count).toBe(17);
  expect(record).toHaveBeenCalledWith("gym_fetch_body_bytes", Buffer.byteLength('[{"id":"gym"}]'));
  const failure = await network.measure(() => client.from("gym_search_public").select("id"));
  expect(failure.error?.code).toBe("57014");
  expect(record).toHaveBeenCalledWith("gym_fetch_failures", 1);
});

it("passes unrelated requests through without consuming their bodies or counting them", async () => {
  const response = new Response("untouched");
  const read = vi.spyOn(response, "text");
  const record = vi.fn();
  const network = createGymQueryTiming({ record, measure: vi.fn() }, async () => response);
  expect(await network.measure(() => network.fetch("https://example.invalid/auth/v1/user"))).toBe(response);
  expect(read).not.toHaveBeenCalled();
  expect(record).toHaveBeenCalledWith("gym_fetch_requests", 0);
});

it("preserves a failed body read and does not log partial contents", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const error = new Error("private-body-error");
  const response = new Response(null);
  response.text = vi.fn(async () => { throw error; });
  await expect(withServerTiming("gym_search_timing", (timing) => {
    const network = createGymQueryTiming(timing, async () => response);
    return network.measure(async () => (await network.fetch("https://example.invalid/rest/v1/gym_search_public")).text());
  })).rejects.toBe(error);
  expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ status: "error", gym_fetch_failures: 1, gym_fetch_body_bytes: 0 });
  expect(log.mock.calls[0][0]).not.toContain(error.message);
});
