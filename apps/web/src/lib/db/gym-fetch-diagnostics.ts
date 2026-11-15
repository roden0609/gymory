import { AsyncLocalStorage } from "node:async_hooks";
import { channel } from "node:diagnostics_channel";
import type { Socket } from "node:net";

type SocketTrace = {
  created: number; lookup?: number; connected?: number; secure?: number;
  sends: number;
};
type RequestTrace = {
  created: number; sent?: number; bodySent?: number; headers?: number;
  socket?: SocketTrace; previousSends?: number;
};
type Scope = { origin: string; active: boolean; requests: RequestTrace[] };
export type GymTransportDetails = {
  observed_requests: number;
  request_create_ms?: number;
  dispatch_wait_ms?: number;
  request_send_ms?: number;
  response_wait_ms?: number;
  socket_setup_ms?: number;
  dns_lookup_ms?: number;
  tcp_connect_ms?: number;
  tls_handshake_ms?: number;
  socket_reused?: boolean;
};

const scopes = new AsyncLocalStorage<Scope>();
const requests = new WeakMap<object, RequestTrace>();
const sockets = new WeakMap<object, SocketTrace>();
const sends = new WeakMap<object, number>();
let installed = false;

function install() {
  if (installed) return;
  installed = true;
  // Subscribers must never throw into the HTTP client. No headers, addresses,
  // request parameters or response bodies are retained by these observers.
  const observe = (name: string, run: (message: never) => void) => {
    channel(name).subscribe((message) => { try { run(message as never); } catch { /* best effort */ } });
  };
  observe("net.client.socket", ({ socket }: { socket: Socket }) => {
    if (!scopes.getStore()?.active) return;
    const trace: SocketTrace = { created: performance.now(), sends: 0 };
    sockets.set(socket, trace);
    const lookup = () => { trace.lookup ??= performance.now(); };
    const connect = () => { trace.connected ??= performance.now(); };
    const secure = () => { trace.secure ??= performance.now(); };
    const cleanup = () => {
      socket.removeListener("lookup", lookup);
      socket.removeListener("connect", connect);
      socket.removeListener("secureConnect", secure);
    };
    socket.once("lookup", lookup);
    socket.once("connect", connect);
    socket.once("secureConnect", secure);
    socket.once("close", cleanup);
  });
  observe("undici:request:create", ({ request }: { request: { origin: string; path: string } }) => {
    const scope = scopes.getStore();
    if (!scope?.active || String(request.origin) !== scope.origin ||
      request.path.split("?", 1)[0] !== "/rest/v1/gym_search_public") return;
    const trace: RequestTrace = { created: performance.now() };
    requests.set(request, trace);
    scope.requests.push(trace);
  });
  observe("undici:client:sendHeaders", ({ request, socket }: { request: object; socket: object }) => {
    const trace = requests.get(request);
    // Track sends on an observed socket even when a different caller uses it.
    const connection = sockets.get(socket);
    if (trace) {
      trace.sent = performance.now();
      trace.socket = connection ? { ...connection } : undefined;
      trace.previousSends = connection?.sends ?? sends.get(socket);
    }
    if (connection) connection.sends++;
    if (trace || sends.has(socket)) sends.set(socket, (sends.get(socket) ?? 0) + 1);
  });
  observe("undici:request:bodySent", ({ request }: { request: object }) => {
    const trace = requests.get(request);
    if (trace) trace.bodySent = performance.now();
  });
  observe("undici:request:headers", ({ request }: { request: object }) => {
    const trace = requests.get(request);
    if (trace) trace.headers = performance.now();
  });
}

/** Passive observation: does not replace fetch, dispatchers, DNS or TLS settings. */
export async function observeGymTransport<T>(origin: string, run: () => Promise<T>, onDetails: (details: GymTransportDetails) => void) {
  install();
  const started = performance.now();
  const scope: Scope = { origin, active: true, requests: [] };
  const details = (): GymTransportDetails => {
    const result: GymTransportDetails = { observed_requests: scope.requests.length };
    // Redirects/retries can emit several requests. Do not mislabel their sum as
    // one connection lifecycle; leave phase details unavailable in that case.
    if (scope.requests.length !== 1) return result;
    const r = scope.requests[0];
    result.request_create_ms = r.created - started;
    if (r.sent !== undefined) result.dispatch_wait_ms = r.sent - r.created;
    if (r.sent !== undefined && r.bodySent !== undefined) result.request_send_ms = r.bodySent - r.sent;
    if (r.bodySent !== undefined && r.headers !== undefined) result.response_wait_ms = r.headers - r.bodySent;
    const s = r.socket;
    if (r.previousSends !== undefined) {
      result.socket_reused = r.previousSends > 0;
      // Setup cost belongs only to the first observed use, never to reused sockets.
      if (s && !result.socket_reused && s.created >= started && s.connected !== undefined) {
        const ready = s.secure ?? s.connected;
        result.socket_setup_ms = ready - s.created;
        if (s.lookup !== undefined) {
          result.dns_lookup_ms = s.lookup - s.created;
          result.tcp_connect_ms = s.connected - s.lookup;
        }
        if (s.secure !== undefined) result.tls_handshake_ms = s.secure - s.connected;
      }
    }
    return result;
  };
  return scopes.run(scope, async () => {
    try {
      return await run();
    } finally {
      scope.active = false;
      try { onDetails(details()); } catch { /* diagnostics must not change fetch results */ }
    }
  });
}
