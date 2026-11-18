import { channel } from "node:diagnostics_channel";
import { EventEmitter } from "node:events";
import { afterEach, expect, it, vi } from "vitest";
import { observeGymTransport } from "./gym-fetch-diagnostics";

afterEach(() => vi.restoreAllMocks());
const publish = (name: string, value: object) => channel(name).publish(value);
const origin = "https://example.invalid";
const request = () => ({ origin, path: "/rest/v1/rpc/search_gyms?secret=private" });

it("observes socket setup, dispatch and server wait without changing the operation", async () => {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const report = vi.fn();
  const socket = new EventEmitter();
  const result = await observeGymTransport(origin, async () => {
    now = 2;
    const r = request();
    publish("undici:request:create", { request: r });
    publish("net.client.socket", { socket });
    now = 12; socket.emit("lookup");
    now = 32; socket.emit("connect");
    now = 62; socket.emit("secureConnect");
    now = 65; publish("undici:client:sendHeaders", { request: r, socket, headers: "private" });
    now = 66; publish("undici:request:bodySent", { request: r });
    now = 166; publish("undici:request:headers", { request: r });
    return "result";
  }, report);
  expect(result).toBe("result");
  expect(report).toHaveBeenCalledWith({ observed_requests: 1, request_create_ms: 2,
    dispatch_wait_ms: 63, request_send_ms: 1, response_wait_ms: 100,
    socket_setup_ms: 60, dns_lookup_ms: 10, tcp_connect_ms: 20,
    tls_handshake_ms: 30, socket_reused: false });
  const reused = vi.fn();
  await observeGymTransport(origin, async () => {
    const r = request(); publish("undici:request:create", { request: r });
    publish("undici:client:sendHeaders", { request: r, socket });
  }, reused);
  expect(reused.mock.calls[0][0]).toMatchObject({ socket_reused: true, observed_requests: 1 });
  expect(reused.mock.calls[0][0]).not.toHaveProperty("tls_handshake_ms");
  socket.emit("close");
  expect(socket.listenerCount("lookup")).toBe(0);
});

it("isolates concurrent requests by identity and ignores other endpoints and origins", async () => {
  const reports = [vi.fn(), vi.fn()];
  await Promise.all(reports.map((report) => observeGymTransport(origin, async () => {
    await Promise.resolve();
    publish("undici:request:create", { request: { origin, path: "/auth/v1/user" } });
    publish("undici:request:create", { request: { origin: "https://other.invalid", path: "/rest/v1/gym_search_public" } });
    const r = request(); publish("undici:request:create", { request: r });
    publish("undici:client:sendHeaders", { request: r, socket: {} });
    await Promise.resolve();
    publish("undici:request:bodySent", { request: r });
    publish("undici:request:headers", { request: r });
  }, report)));
  for (const report of reports) {
    expect(report.mock.calls[0][0]).toMatchObject({ observed_requests: 1, response_wait_ms: expect.any(Number) });
    expect(report.mock.calls[0][0]).not.toHaveProperty("socket_reused");
  }
});

it("reports unavailable phases honestly and preserves rejection even if reporting fails", async () => {
  const error = new Error("private");
  const report = vi.fn(() => { throw new Error("logging failed"); });
  await expect(observeGymTransport(origin, async () => { throw error; }, report)).rejects.toBe(error);
  expect(report).toHaveBeenCalledWith({ observed_requests: 0 });
  const multiple = vi.fn();
  await observeGymTransport(origin, async () => {
    publish("undici:request:create", { request: request() });
    publish("undici:request:create", { request: request() });
  }, multiple);
  expect(multiple).toHaveBeenCalledWith({ observed_requests: 2 });
});

it("observes the real Node fetch lifecycle against a local HTTP server", async () => {
  const { createServer } = await import("node:http");
  const server = createServer((_req, res) => { res.end("[]"); });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test address");
    const localOrigin = `http://127.0.0.1:${address.port}`;
    const report = vi.fn();
    const response = await observeGymTransport(localOrigin,
      () => fetch(`${localOrigin}/rest/v1/gym_search_public`), report);
    expect(await response.text()).toBe("[]");
    expect(report.mock.calls[0][0]).toMatchObject({ observed_requests: 1,
      socket_reused: false, socket_setup_ms: expect.any(Number),
      dispatch_wait_ms: expect.any(Number), response_wait_ms: expect.any(Number) });
    expect(report.mock.calls[0][0]).not.toHaveProperty("tls_handshake_ms");
    for (let i = 0; i < 3; i++) {
      const next = await observeGymTransport(localOrigin,
        () => fetch(`${localOrigin}/rest/v1/gym_search_public`), report);
      await next.text();
    }
    expect(report.mock.calls.some(([details]) => details.socket_reused === true)).toBe(true);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
