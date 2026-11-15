import { randomUUID } from "node:crypto";
import { cache } from "react";

// React shares this ID across Server Components and metadata in one render.
// Outside a React render (e.g. an API handler), each operation gets its own ID.
const getTimingRequestId = cache(() => randomUUID());

type TimingEvent = "gym_search_timing" | "filter_options_timing" | "gym_brand_overview_timing";
type Metric =
  | "gym_fetch_headers_ms" | "gym_fetch_body_ms" | "gym_fetch_body_bytes"
  | "gym_fetch_requests" | "gym_fetch_failures" | "gym_sdk_overhead_ms"
  | "catalog_lookup_ms" | "gym_query_ms" | "votes_query_ms"
  | "sort_paginate_ms" | "categories_ms" | "machine_suggestions_ms"
  | "brand_overview_ms" | "matched_gyms" | "returned_gyms" | "gym_query_batches";

export type FetchTimingDetails = {
  attempt: number; status: "ok" | "http_error" | "transport_error";
  headers_ms: number; body_ms?: number; body_bytes?: number; http_status?: number;
  observed_requests?: number; request_create_ms?: number; dispatch_wait_ms?: number;
  request_send_ms?: number; response_wait_ms?: number; socket_setup_ms?: number;
  dns_lookup_ms?: number; tcp_connect_ms?: number; tls_handshake_ms?: number;
  socket_reused?: boolean; supabase_request_id?: string; cloudflare_ray?: string;
};

export type ServerTiming = {
  fetchDetails?: (details: FetchTimingDetails) => void;
  record: (metric: Metric, value: number) => void;
  measure: <T>(metric: Metric, operation: () => PromiseLike<T>) => Promise<T>;
};

/** Log allowlisted metrics and validated trace IDs; never serialize inputs, rows or errors. */
export async function withServerTiming<T>(
  event: TimingEvent,
  operation: (timing: ServerTiming) => Promise<T>
): Promise<T> {
  const requestId = getTimingRequestId();
  const started = performance.now();
  const metrics: Partial<Record<Metric, number>> = {};
  let status: "ok" | "error" = "error";
  const record = (metric: Metric, value: number) => {
    if (Number.isFinite(value) && value >= 0) metrics[metric] = value;
  };
  const timing: ServerTiming = {
    record,
    fetchDetails(details) {
      const numericKeys = ["attempt", "headers_ms", "body_ms", "body_bytes", "http_status",
        "observed_requests", "request_create_ms", "dispatch_wait_ms", "request_send_ms",
        "response_wait_ms", "socket_setup_ms", "dns_lookup_ms", "tcp_connect_ms", "tls_handshake_ms"] as const;
      const safe: Record<string, number | string | boolean> = {};
      for (const key of numericKeys) {
        const value = details[key];
        if (typeof value === "number" && Number.isFinite(value) && value >= 0) safe[key] = Math.round(value * 100) / 100;
      }
      if (typeof details.socket_reused === "boolean") safe.socket_reused = details.socket_reused;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(details.supabase_request_id ?? "")) safe.supabase_request_id = details.supabase_request_id!;
      if (/^[0-9a-f]{16,32}-[A-Z]{3}$/i.test(details.cloudflare_ray ?? "")) safe.cloudflare_ray = details.cloudflare_ray!;
      const region = process.env.VERCEL_REGION;
      if (region && /^[a-z]{3}[0-9]$/.test(region)) safe.region = region;
      const status = ["ok", "http_error", "transport_error"].includes(details.status) ? details.status : "transport_error";
      console.info(JSON.stringify({ event: "gym_fetch_timing", requestId, status, ...safe }));
    },
    async measure(metric, run) {
      const start = performance.now();
      try {
        return await run();
      } finally {
        record(metric, (metrics[metric] ?? 0) + performance.now() - start);
      }
    },
  };
  try {
    const result = await operation(timing);
    status = "ok";
    return result;
  } finally {
    const rounded = Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, Math.round(value * 100) / 100]));
    console.info(JSON.stringify({ event, requestId, status, ...rounded, total_ms: Math.round((performance.now() - started) * 100) / 100 }));
  }
}
