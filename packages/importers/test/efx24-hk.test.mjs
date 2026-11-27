import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

import {
  assertNotChallengeHtml,
  extractBranchUrls,
  mapBranchToGymRow,
  parseArgs,
  runImporter,
  validateBranchDetails,
} from "../../../scripts/gyms/import-efx24-hk.mjs";

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

  it("prefers the matching selector address and falls back when it is ambiguous", async () => {
    const listUrl = "https://efx24.com/find-us/";
    const citywalk = `${listUrl}citywalk/`;
    const echo = `${listUrl}echo/`;
    const central = `${listUrl}central/`;
    const townPlaza = `${listUrl}tuen-mun-town-plaza/`;
    const townPlazaZh = "https://efx24.com/zh-hant/tuen-mun-town-plaza/";
    const list = `
      <a href="${citywalk}">Citywalk</a>
      <a href="${echo}">Echo House</a>
      <a href="${central}">Central</a>
      <a href="${townPlaza}">Tuen Mun Town Plaza</a>
      <option data-address="1/F &amp; 2/F, Echo House, 28 Tonkin St, Cheung Sha Wan, Hong Kong, Hong Kong"
        data-title="EFX24 Echo House"></option>
      <option data-title="EFX24 Citywalk (Coming soon)"
        data-address="Citywalk 1, Tsuen Wan, Tsuen Wan, Hong Kong, Hong Kong"></option>
      <option data-title="EFX24 Citywalk" data-address="Citywalk 1, Tsuen Wan, Hong Kong"></option>
      <option data-title="EFX24 Central" data-address="10 First Road"></option>
      <option data-title="EFX24 Central" data-address="20 Second Road"></option>
    `;
    const pages = new Map([
      [listUrl, list],
      [citywalk, "<h1>EFX24 Citywalk</h1><dl><dt>Hours</dt><dd>Coming soon</dd></dl>"],
      [echo, "<h1>EFX24 Echo House</h1><div>28 Tonkin St</div>"],
      [central, "<h1>EFX24 Central</h1><div>30 Third Road, Central</div>"],
      [townPlaza, `
        <nav><div>EFX24 Tuen Mun Town Plaza</div><div>Other Branch (Coming soon)</div></nav>
        <a href="${townPlazaZh}">繁</a>
        <section class="efx24-sp-hero"><h1>EFX24 Tuen Mun Town Plaza</h1></section>
      `],
      [townPlazaZh, `
        <h1>EFX24 屯門市廣場</h1>
        <p>輕鐵市中心站步行2分鐘</p>
        <dl><dt>地址</dt><dd>屯門市廣場一期2樓2219號舖</dd></dl>
      `],
    ]);
    const { rows } = await runImporter({ browser: true, "skip-geocode": true }, {
      createChromeHtmlFetcher: async () => ({
        fetchHtml: async (url) => pages.get(url),
        close: vi.fn(),
      }),
      writeRows: vi.fn(),
      log: vi.fn(),
    });

    expect(rows.map(({ address }) => address)).toEqual([
      "30 Third Road, Central",
      "Citywalk 1, Tsuen Wan, Hong Kong",
      "1/F & 2/F, Echo House, 28 Tonkin St, Cheung Sha Wan, Hong Kong",
      null,
    ]);
    expect(rows.find(({ website_url }) => website_url === townPlaza)?.address_zh)
      .toBe("屯門市廣場一期2樓2219號舖");
    expect(rows.find(({ website_url }) => website_url === townPlaza)?.is_active).toBe(true);
    expect(rows.find(({ website_url }) => website_url === citywalk)?.is_active).toBe(false);
  });
});
