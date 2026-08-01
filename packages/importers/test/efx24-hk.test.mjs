import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

import {
  assertNotChallengeHtml,
  extractBranchUrls,
  mapBranchToGymRow,
  parseArgs,
  runImporter,
  validateBranchDetails,
} from "../../../scripts/import-efx24-hk.mjs";

const fixedNow = new Date("2026-08-01T04:00:00.000Z");

describe("EFX24 importer", () => {
  it("parses snapshot and geocode options without executing its CLI", () => {
    expect(parseArgs([
      "--details-out",
      "details.json",
      "--skip-geocode",
      "--browser",
      "--browser-profile",
      ".cache/test-profile",
    ])).toEqual({
      "details-out": "details.json",
      "skip-geocode": true,
      browser: true,
      "browser-profile": ".cache/test-profile",
    });
  });

  it.each([
    [["--unknown"], "Unknown argument: --unknown"],
    [["--out"], "Missing value for --out"],
    [["rows.json"], "Unexpected positional argument: rows.json"],
  ])("rejects malformed arguments %j", (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(message);
  });

  it("filters HTML links and maps a deterministic row", async () => {
    const html = await readFile(
      new URL("./fixtures/efx24-hk/list.html", import.meta.url),
      "utf8"
    );
    expect(extractBranchUrls(html)).toEqual(["https://efx24.com/find-us/central/"]);
    expect(mapBranchToGymRow({
      url: "https://efx24.com/find-us/central/",
      title: "EFX24 Central",
      title_zh: "EFX24 中環",
      address: "Central, Hong Kong",
      address_zh: "香港中環",
      phone: "2123 4567",
      is_active: true,
    }, {}, fixedNow)).toMatchObject({
      slug: "efx24-central",
      district_code: "HK-CW",
      contact_phone: "21234567",
      last_reported_at: "2026-08-01T04:00:00.000Z",
    });
  });

  it("rejects a CAPTCHA page even when the HTTP response would be successful", async () => {
    const html = await readFile(
      new URL("./fixtures/efx24-hk/captcha.html", import.meta.url),
      "utf8"
    );

    expect(() => assertNotChallengeHtml(html, "list page")).toThrow(
      "CAPTCHA or bot challenge"
    );
    expect(() => extractBranchUrls(html)).toThrow("CAPTCHA or bot challenge");
  });

  it("rejects empty, invalid, and duplicate detail sets", () => {
    expect(() => validateBranchDetails([])).toThrow("did not contain any branches");
    expect(() => validateBranchDetails([{ url: "https://efx24.com/find-us/test/" }])).toThrow(
      "url and title"
    );
    expect(() => validateBranchDetails([
      { url: "https://efx24.com/find-us/test/", title: "Test" },
      { url: "https://efx24.com/find-us/test/", title: "Test Again" },
    ])).toThrow("duplicate branch URLs");
  });

  it("does not overwrite output when live parsing returns no branches", async () => {
    const writeRows = vi.fn();
    const writeDetails = vi.fn();
    const upsertRows = vi.fn();

    await expect(runImporter({}, {
      fetchBranchDetailsFromSite: vi.fn().mockResolvedValue([]),
      createMapboxGeocoder: vi.fn(() => null),
      writeRows,
      writeDetails,
      upsertRows,
      now: () => fixedNow,
      cwd: () => "/tmp/gymory-efx24-test",
      log: vi.fn(),
    })).rejects.toThrow("did not contain any branches");

    expect(writeRows).not.toHaveBeenCalled();
    expect(writeDetails).not.toHaveBeenCalled();
    expect(upsertRows).not.toHaveBeenCalled();
  });

  it("uses and closes the injected Chrome HTML session in browser mode", async () => {
    const browserFetchHtml = vi.fn();
    const close = vi.fn();
    const fetchBranchDetailsFromSite = vi.fn().mockResolvedValue([
      {
        url: "https://efx24.com/find-us/central/",
        title: "EFX24 Central",
        title_zh: "EFX24 中環",
        address: "Central, Hong Kong",
        address_zh: "香港中環",
        phone: "2123 4567",
        is_active: true,
      },
    ]);
    const writeRows = vi.fn();

    const result = await runImporter(
      {
        browser: true,
        "browser-profile": ".cache/test-profile",
        "skip-geocode": true,
      },
      {
        createChromeHtmlFetcher: vi.fn().mockResolvedValue({
          fetchHtml: browserFetchHtml,
          close,
        }),
        fetchBranchDetailsFromSite,
        createMapboxGeocoder: vi.fn(() => null),
        writeRows,
        now: () => fixedNow,
        cwd: () => "/tmp/gymory-efx24-test",
        log: vi.fn(),
      }
    );

    expect(fetchBranchDetailsFromSite).toHaveBeenCalledWith(undefined, browserFetchHtml);
    expect(close).toHaveBeenCalledOnce();
    expect(writeRows).toHaveBeenCalledOnce();
    expect(result.rows).toHaveLength(1);
  });
});
