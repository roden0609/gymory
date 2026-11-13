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

export type ServerTiming = {
  record: (metric: Metric, value: number) => void;
  measure: <T>(metric: Metric, operation: () => PromiseLike<T>) => Promise<T>;
};

/** Log only allowlisted numeric metrics; never serialize inputs, rows or errors. */
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
