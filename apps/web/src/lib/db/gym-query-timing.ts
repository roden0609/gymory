import { Buffer } from "node:buffer";
import { observeGymTransport, type GymTransportDetails } from "./gym-fetch-diagnostics";
import type { FetchTimingDetails, ServerTiming } from "@/lib/server-timing";

/** Observe the existing SDK read once; never clone, reparse, or log its body/URL. */
export function createGymQueryTiming(timing: ServerTiming, fetcher: typeof fetch = fetch) {
  let headersMs = 0;
  let bodyMs = 0;
  let bodyBytes = 0;
  let requests = 0;
  let failures = 0;
  let sdkMs = 0;

  const trackedFetch: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (new URL(url).pathname !== "/rest/v1/gym_search_public") return fetcher(input, init);

    requests += 1;
    const started = performance.now();
    let transport: GymTransportDetails | undefined;
    const detail: FetchTimingDetails = { attempt: requests, status: "transport_error", headers_ms: 0 };
    let logged = false;
    const log = () => {
      if (logged) return;
      logged = true;
      try { timing.fetchDetails?.({ ...detail, ...transport }); } catch { /* best effort diagnostics */ }
    };
    let response: Response;
    try {
      response = await observeGymTransport(new URL(url).origin, () => fetcher(input, init), (value) => { transport = value; });
    } catch (error) {
      failures += 1;
      detail.headers_ms = performance.now() - started;
      log();
      throw error;
    } finally {
      headersMs += performance.now() - started;
    }
    detail.headers_ms = performance.now() - started;
    detail.http_status = response.status;
    detail.status = response.ok ? "ok" : "http_error";
    detail.supabase_request_id = response.headers.get("sb-request-id") ?? undefined;
    detail.cloudflare_ray = response.headers.get("cf-ray") ?? undefined;
    if (!response.ok) failures += 1;

    // The installed PostgREST SDK consumes response.text(), then JSON.parse().
    // Preserve that path and Response metadata without buffering a second copy.
    const readText = response.text.bind(response);
    response.text = async () => {
      const start = performance.now();
      let body: string | undefined;
      try {
        body = await readText();
        return body;
      } catch (error) {
        if (response.ok) failures += 1;
        detail.status = "transport_error";
        throw error;
      } finally {
        bodyMs += performance.now() - start;
        if (body !== undefined) bodyBytes += Buffer.byteLength(body, "utf8");
        detail.body_ms = performance.now() - start;
        if (body !== undefined) detail.body_bytes = Buffer.byteLength(body, "utf8");
        log();
      }
    };
    return response;
  };

  return {
    fetch: trackedFetch,
    async measure<T>(query: () => PromiseLike<T>): Promise<T> {
      const start = performance.now();
      const previousNetworkMs = headersMs + bodyMs;
      try {
        return await query();
      } finally {
        // Remainder includes auth/session preparation, SDK scheduling, JSON parsing
        // and small instrumentation costs; it is NOT isolated JSON decode time.
        sdkMs += Math.max(0, performance.now() - start - (headersMs + bodyMs - previousNetworkMs));
        timing.record("gym_fetch_headers_ms", headersMs);
        timing.record("gym_fetch_body_ms", bodyMs);
        timing.record("gym_fetch_body_bytes", bodyBytes);
        timing.record("gym_fetch_requests", requests);
        timing.record("gym_fetch_failures", failures);
        timing.record("gym_sdk_overhead_ms", sdkMs);
      }
    },
  };
}
