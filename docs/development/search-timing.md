# Search server timing

After deploying the change, reproduce a brand/filter selection and open Vercel
Runtime Logs for that deployment. Search for `gym_search_timing`,
`filter_options_timing`, or `gym_brand_overview_timing`. Each event is one JSON
line. Use `requestId` to correlate operations within the same React server render,
including metadata. Separate renders, prefetch requests, and API handler operations
have separate IDs. No ID is added to client props or API responses.

| Event | Metrics |
| --- | --- |
| `gym_search_timing` | `catalog_lookup_ms`, `gym_query_ms`, `sort_paginate_ms`, `gym_query_batches`, `matched_gyms`, `returned_gyms` |
| `filter_options_timing` | `categories_ms`, `machine_suggestions_ms` |
| `gym_brand_overview_timing` | `brand_overview_ms` |

Every event also includes `total_ms` and `status` (`ok` if the operation returned,
`error` if it threw). Existing query fallbacks that return empty data instead of
throwing still report `ok`; this is not a database health status. Skipped phases
are omitted. `gym_query_ms` accumulates all sequential ID batches, including SQL vote aggregation.
After migration 0073 there is no separate vote request or `votes_query_ms`. The two filter
option phases run concurrently, so their sum can exceed that event's total.
`matched_gyms` is the number of loaded gyms after collection filtering, before
pagination; `returned_gyms` is the number returned for the requested page.

Supabase timings measure the awaited application call, including network,
PostgREST, database execution, and response handling. They are not pure SQL
execution times. Use `EXPLAIN ANALYZE` for pure SQL comparisons. Event totals
cover these operations, not the entire Next.js render or the browser's streamed
response; compare against DevTools Network timings to locate remaining gaps.

Logs contain only event names, generated IDs, status, durations, and counts.
Do not add raw parameters, coordinates, database rows, credentials, or error
messages. Database projections, permissions, and public response shapes are
unchanged by this instrumentation.


## Search performance rollout

Apply migrations `0073_add_gym_search_vote_totals.sql` and
`0074_batch_public_inventory_visibility.sql` before deploying this web version.
0073 joins live vote totals into a dedicated security-invoker search view, with
explicit column grants. 0074 replaces per-row model visibility checks with a
statement-level set of approved public gym/type keys, retaining all publication
conditions and RLS. Existing sorting, collection filtering, and global pagination
remain in application code to preserve results.

Machine suggestions, category options, and gym brand summaries use the Next.js
Data Cache with a 60-second revalidation interval and anonymous-only reads. They
never use request cookies or service-role credentials. Admin catalog changes
invalidate both catalog and summary tags; gym model edits invalidate summary
tags. Out-of-band imports and other write paths rely on time revalidation.
Next.js can serve a stale entry during background refresh or failed refreshes;
60 seconds is a refresh interval, not a strict maximum age. Shared caches do not
contain gym search results or vote counts. Failed cache loads are thrown inside
the cache, so transient errors are not stored as empty successful results.

Local transaction benchmarks (157 matching gyms, no existing votes) measured
145–169 ms for the search with vote aggregation before 0074 and 14–22 ms after
0074. These are SQL execution times, not deployed/browser measurements. Public
permission/visibility fixtures include populated votes; fixture and schema tests
roll back. Re-test Vercel Runtime Logs and browser timings after deployment.


Migration 0075 adds public `gym_chain_code` and an active-gym partial index.
Apply it before deploying the equality/IN brand filters. The code is filter-only
and is not added to API/client result projections. Existing seven slug-prefix
memberships are backfilled, legacy inserts default from their public slug, and
explicit classification survives later slug renames. Public URL slugs remain
unchanged. The brand summary cache projection version is bumped to v2.


## Detailed gym request timing

`gym_search_timing` also reports these numeric metrics for requests to the
`gym_search_public` endpoint, accumulated across sequential ID batches:

| Metric | Meaning |
| --- | --- |
| `gym_fetch_headers_ms` | Time awaiting fetch to resolve with response headers: connection/network, gateway/pool/SQL/serialization waits and scheduling may all contribute. Not pure SQL time. |
| `gym_fetch_body_ms` | Time consuming the response via the SDK's existing `response.text()` call: body transfer, decompression, UTF-8 decoding and scheduling. Headers do not mean the server has finished generating the body. |
| `gym_fetch_body_bytes` | UTF-8 byte length of the decoded response text, not compressed bytes transferred on the wire. No body is logged. |
| `gym_sdk_overhead_ms` | Query elapsed time minus the two measured fetch phases: auth/session preparation, SDK/JSON parsing, scheduling and small instrumentation costs. Not isolated JSON decoding time. |
| `gym_fetch_requests` | Number of matching HTTP fetch attempts. |
| `gym_fetch_failures` | Matching requests with a transport rejection, HTTP non-success, or failed body read. |

The installed PostgREST SDK reads text and parses JSON internally. Instrumentation
wraps that existing text read; it neither clones the response nor parses JSON
again. Other endpoints, queries, cookies and response shapes are unchanged. HTTP
errors/rejections still follow the existing SDK/application behavior. No URLs,
parameters, response headers, credentials, error messages or row contents are
written to these metrics. There are no extra database/network requests.

Interpret a large headers phase as waiting before body consumption, a large body
phase as receiving/decoding the response, and a large SDK remainder as application
client work needing further investigation. These distinguish phases, not exact
root causes. DNS/TLS, pool wait and pure SQL are not individually separated; use
Supabase database diagnostics / EXPLAIN to correlate those. Logging must be
deployed before Vercel can show the new fields; old logs cannot be split retroactively.
