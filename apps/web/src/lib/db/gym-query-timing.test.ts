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
  expect(JSON.parse(log.mock.calls.find(([line]) => JSON.parse(line).event === "gym_search_timing")![0])).toMatchObject({
    gym_fetch_headers_ms: 40, gym_fetch_body_ms: 60,
    gym_sdk_overhead_ms: 10, gym_fetch_body_bytes: Buffer.byteLength(body) * 2,
    gym_fetch_requests: 2, gym_fetch_failures: 0, status: "ok",
  });
  expect(log.mock.calls.find(([line]) => JSON.parse(line).event === "gym_search_timing")![0]).not.toMatch(/private|Authorization|中文|example/);
});

it("preserves transport rejection and logs elapsed headers wait", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const error = new Error("private-network-error");
  await expect(withServerTiming("gym_search_timing", (timing) => {
    const network = createGymQueryTiming(timing, async () => { throw error; });
    return network.measure(() => network.fetch("https://example.invalid/rest/v1/gym_search_public"));
  })).rejects.toBe(error);
  expect(JSON.parse(log.mock.calls.find(([line]) => JSON.parse(line).event === "gym_search_timing")![0])).toMatchObject({ status: "error", gym_fetch_failures: 1, gym_fetch_requests: 1, gym_fetch_body_bytes: 0 });
  expect(log.mock.calls.find(([line]) => JSON.parse(line).event === "gym_search_timing")![0]).not.toContain(error.message);
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
  expect(JSON.parse(log.mock.calls.find(([line]) => JSON.parse(line).event === "gym_search_timing")![0])).toMatchObject({ status: "error", gym_fetch_failures: 1, gym_fetch_body_bytes: 0 });
  expect(log.mock.calls.find(([line]) => JSON.parse(line).event === "gym_search_timing")![0]).not.toContain(error.message);
});

it("correlates each batch with only validated upstream trace IDs and no raw headers", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const upstreamId = "12345678-1234-1234-1234-123456789abc";
  await withServerTiming("gym_search_timing", async (timing) => {
    const network = createGymQueryTiming(timing, async () => new Response("[]", {
      headers: { "sb-request-id": upstreamId, "cf-ray": "abcdef1234567890-NRT", "set-cookie": "private-cookie", "server-timing": "private-description" },
    }));
    for (let i = 0; i < 2; i++) {
      await network.measure(async () => (await network.fetch("https://example.invalid/rest/v1/gym_search_public?private=filter")).text());
    }
  });
  const events = log.mock.calls.map(([line]) => JSON.parse(line));
  const summary = events.find((e) => e.event === "gym_search_timing");
  const attempts = events.filter((e) => e.event === "gym_fetch_timing");
  expect(attempts).toHaveLength(2);
  expect(attempts.map((e) => e.attempt)).toEqual([1, 2]);
  for (const event of attempts) expect(event).toMatchObject({ requestId: summary.requestId,
    supabase_request_id: upstreamId, cloudflare_ray: "abcdef1234567890-NRT",
    observed_requests: 0, http_status: 200, status: "ok", body_bytes: 2 });
  expect(JSON.stringify(events)).not.toMatch(/private|example|filter|cookie/);
});

it("drops invalid response trace values and reports HTTP/body errors separately", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  await withServerTiming("gym_search_timing", async (timing) => {
    const network = createGymQueryTiming(timing, async () => new Response("private-error", {
      status: 503, headers: { "sb-request-id": "private-id", "cf-ray": "private-ray" },
    }));
    await network.measure(async () => (await network.fetch("https://example.invalid/rest/v1/gym_search_public")).text());
  });
  const event = log.mock.calls.map(([line]) => JSON.parse(line)).find((e) => e.event === "gym_fetch_timing");
  expect(event).toMatchObject({ status: "http_error", http_status: 503 });
  expect(event).not.toHaveProperty("supabase_request_id");
  expect(event).not.toHaveProperty("cloudflare_ray");
  expect(JSON.stringify(log.mock.calls)).not.toContain("private");
});

it("tracks POST search RPC bodies without logging IDs or coordinates", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('[{"id":"public-gym"}]', {
    headers: { "Content-Type": "application/json", "Content-Range": "0-0/144" },
  }));
  await withServerTiming("gym_search_timing", async (timing) => {
    const network = createGymQueryTiming(timing, fetcher);
    const client = createServerClient("https://example.invalid", "public-key", {
      cookies: { getAll: () => [], setAll() {} }, global: { fetch: network.fetch },
    });
    const result = await network.measure(() => client.rpc("search_gyms", {
      p_gym_ids: ["private-filter-id"], p_user_lat: 22.3, p_user_lng: 114.1,
    }, { count: "exact" }).select("id").order("search_order").range(0, 19));
    expect(result.count).toBe(144);
    expect(result.data).toEqual([{ id: "public-gym" }]);
  });
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
  const events = log.mock.calls.map(([line]) => JSON.parse(line));
  expect(events.find((e) => e.event === "gym_search_timing")).toMatchObject({ gym_fetch_requests: 1, gym_fetch_failures: 0 });
  expect(JSON.stringify(events)).not.toMatch(/private-filter-id|22\.3|114\.1|public-gym/);
});
