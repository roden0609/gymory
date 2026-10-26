import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { upsertGymsFromFile } from "../../../scripts/gyms/lib/upsert-gyms-from-file.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const gym = {
  name: "Saved Gym",
  slug: "saved-gym",
  district_code: "HK-CW",
  country_code: "HK",
  address: "Saved address",
  lat: 22.3,
  lng: 114.1,
  last_reported_at: "2026-08-01T00:00:00.000Z",
};
let directory;
beforeEach(async () => { directory = await mkdtemp(path.join(os.tmpdir(), "gymory-upsert-file-")); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

async function save(value) {
  const file = path.join(directory, "gyms.json");
  await writeFile(file, JSON.stringify(value));
  return file;
}

it("persists saved rows unchanged and leaves the input file untouched", async () => {
  const file = await save([gym]);
  const persist = vi.fn().mockResolvedValue({ inserted: 1 });
  const result = await upsertGymsFromFile({
    args: { "upsert-file": "gyms.json" }, cwd: directory, upsertRows: persist, log: vi.fn(),
  });
  expect(persist).toHaveBeenCalledExactlyOnceWith([gym]);
  expect(result).toMatchObject({ inputPath: file, upserted: true, result: { inserted: 1 } });
  expect(JSON.parse(await readFile(file, "utf8"))).toEqual([gym]);
});

it.each([
  [null, "did not produce any rows"],
  [[], "did not produce any rows"],
  [[null], "missing a slug"],
  [[{ id: "raw-detail" }], "missing a slug"],
  [[gym, gym], "duplicate gym slugs"],
  [[{ ...gym, name: null }], "non-empty name"],
  [[{ ...gym, district_code: null }], "non-empty district_code"],
  [[{ ...gym, country_code: "US" }], "HK country and district codes"],
  [[{ ...gym, slug: " saved-gym " }], "whitespace"],
])("rejects invalid input before any writes: %j", async (value, message) => {
  const file = await save(value);
  const persist = vi.fn();
  await expect(upsertGymsFromFile({ args: { "upsert-file": file }, upsertRows: persist }))
    .rejects.toThrow(message);
  expect(persist).not.toHaveBeenCalled();
});

it("rejects missing files, malformed JSON, missing flag values and conflicting modes", async () => {
  const persist = vi.fn();
  const file = path.join(directory, "gyms.json");
  await expect(upsertGymsFromFile({ args: { "upsert-file": file }, upsertRows: persist })).rejects.toThrow("ENOENT");
  await writeFile(file, "invalid JSON");
  await expect(upsertGymsFromFile({ args: { "upsert-file": file }, upsertRows: persist })).rejects.toThrow();
  await expect(upsertGymsFromFile({ args: { "upsert-file": true }, upsertRows: persist })).rejects.toThrow("Missing value");
  for (const flag of ["upsert", "repair-stale", "details-file", "out", "limit", "browser", "skip-geocode", "district-overrides"]) {
    await expect(upsertGymsFromFile({ args: { "upsert-file": file, [flag]: true }, upsertRows: persist })).rejects.toThrow("must be used alone");
  }
  expect(persist).not.toHaveBeenCalled();
});

it("requires HYROX metadata and unique partner IDs before writing any rows", async () => {
  const persist = vi.fn();
  const file = await save([gym]);
  await expect(upsertGymsFromFile({ args: { "upsert-file": file }, upsertRows: persist, hyrox: true })).rejects.toThrow("HYROX partner metadata");
  const partner = { ...gym, is_hyrox_official: true, hyrox_partner_id: "123", hyrox_source_url: "https://hyrox.com/", hyrox_source_synced_at: gym.last_reported_at };
  await save([partner, { ...partner, slug: "another-gym" }]);
  await expect(upsertGymsFromFile({ args: { "upsert-file": file }, upsertRows: persist, hyrox: true })).rejects.toThrow("duplicate HYROX partner ID");
  expect(persist).not.toHaveBeenCalled();
});

describe("all importer CLIs", () => {
  it.each(["247-fitness-hk", "anytime-fitness-hk", "efx24-hk", "go24-fitness-hk", "hyrox-official-hk", "lcsd-fitness-hk", "pure-fitness-hk", "snap-fitness-hk"])("%s writes saved rows using only mocked Supabase requests", async (source) => {
    const row = source === "hyrox-official-hk" ? {
      ...gym, is_hyrox_official: true, hyrox_partner_id: "123",
      hyrox_source_url: "https://hyrox.com/find-a-hyrox-partner-gym/",
      hyrox_source_synced_at: gym.last_reported_at,
    } : gym;
    const file = await save([row]);
    const requestsFile = path.join(directory, "requests.jsonl");
    const preload = path.join(directory, "mock-fetch.mjs");
    await writeFile(preload, `
      import { appendFileSync } from 'node:fs';
      globalThis.fetch = async (input, options = {}) => {
        const url = new URL(input);
        if (url.origin !== 'https://supabase.invalid') throw new Error('Unexpected source/geocode request: ' + url);
        const method = options.method ?? 'GET';
        const body = options.body ? JSON.parse(options.body) : null;
        appendFileSync(process.env.REQUESTS_FILE, JSON.stringify({ path: url.pathname, method, body }) + '\\n');
        return new Response(JSON.stringify(method === 'POST' && url.pathname === '/rest/v1/gyms' ? [{ id: 'test-gym-id', ...body }] : []), { status: 200 });
      };
    `);
    const result = spawnSync(process.execPath, ["--import", preload, `scripts/gyms/import-${source}.mjs`, "--upsert-file", file], {
      cwd: root, encoding: "utf8", timeout: 10000,
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "https://supabase.invalid", SUPABASE_SECRET_KEY: "test-key", REQUESTS_FILE: requestsFile },
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Imported 1 gym rows");
    const requests = (await readFile(requestsFile, "utf8")).trim().split("\n").map(JSON.parse);
    expect(requests.find((request) => request.method === "POST" && request.path === "/rest/v1/gyms")?.body).toEqual(row);
    expect(requests.some((request) => request.path === "/rest/v1/gym_update_submissions" && request.method === "POST")).toBe(true);
    expect(await readFile(file, "utf8")).toBe(JSON.stringify([row]));
  });
});
