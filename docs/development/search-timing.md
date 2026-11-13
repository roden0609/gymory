# Search server timing

After deploying the change, reproduce a brand/filter selection and open Vercel
Runtime Logs for that deployment. Search for `gym_search_timing`,
`filter_options_timing`, or `gym_brand_overview_timing`. Each event is one JSON
line. Use `requestId` to correlate operations within the same React server render,
including metadata. Separate renders, prefetch requests, and API handler operations
have separate IDs. No ID is added to client props or API responses.

| Event | Metrics |
| --- | --- |
| `gym_search_timing` | `catalog_lookup_ms`, `gym_query_ms`, `votes_query_ms`, `sort_paginate_ms`, `gym_query_batches`, `matched_gyms`, `returned_gyms` |
| `filter_options_timing` | `categories_ms`, `machine_suggestions_ms` |
| `gym_brand_overview_timing` | `brand_overview_ms` |

Every event also includes `total_ms` and `status` (`ok` if the operation returned,
`error` if it threw). Existing query fallbacks that return empty data instead of
throwing still report `ok`; this is not a database health status. Skipped phases
are omitted. `gym_query_ms` accumulates all sequential ID batches. The two filter
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
