import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

import {
  extractAddressFromPrimaryInfoColumn,
  extractBranchUrls,
  loadLiveBranchDetails,
  mapBranchToGymRow,
  parseArgs,
} from "../../../scripts/import-go24-fitness-hk.mjs";

const fixedNow = new Date("2026-08-01T04:00:00.000Z");

describe("GO24 Fitness importer", () => {
  it("parses override and output options without executing its CLI", () => {
    expect(parseArgs([
      "--district-overrides",
      "districts.json",
      "--out",
      "rows.json",
      "--browser",
      "--browser-profile",
      ".cache/test-profile",
    ])).toEqual({
      "district-overrides": "districts.json",
      out: "rows.json",
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
      new URL("./fixtures/go24-fitness-hk/list.html", import.meta.url),
      "utf8"
    );
    expect(extractBranchUrls(html)).toEqual([
      "https://www.go24fitness.com/en/look-inside/mong-kok",
    ]);
    expect(mapBranchToGymRow({
      url: "https://www.go24fitness.com/en/look-inside/mong-kok",
      title: "Mong Kok",
      title_zh: "旺角",
      address: "Mong Kok, Kowloon",
      address_zh: "九龍旺角",
      phone: "2399 0000",
      is_active: true,
    }, {}, fixedNow)).toMatchObject({
      name: "GO24 Fitness Mong Kok",
      slug: "go24-fitness-mong-kok",
      district_code: "HK-YTM",
      last_reported_at: "2026-08-01T04:00:00.000Z",
    });
  });

  it("extracts every address line when the primary column has extra classes", () => {
    const html = `
      <h1 class="uk-heading-medium">Wong Tai Sin</h1>
      <div class="uk-width-3-5@m">
        <div class="uk-width-1-2@s uk-first-column">
          <p>7 &amp; 9, L2, Cheung Ying Alley,&nbsp;</p>
          <p>110 Lung Cheung Road,&nbsp;</p>
          <p>Wong Tai Sin</p>
        </div>
        <div class="uk-width-1-2@s"><p>67786300</p></div>
      </div>
    `;

    expect(extractAddressFromPrimaryInfoColumn(html, "Wong Tai Sin")).toBe(
      "7 & 9, L2, Cheung Ying Alley, 110 Lung Cheung Road, Wong Tai Sin"
    );
  });

  it("uses and closes the injected Chrome session in browser mode", async () => {
    const browserFetchHtml = vi.fn();
    const close = vi.fn();
    const details = [{
      url: "https://www.go24fitness.com/en/look-inside/mong-kok",
      title: "Mong Kok",
    }];
    const fetchBranchDetailsFromSite = vi.fn().mockResolvedValue(details);

    const result = await loadLiveBranchDetails(
      { browser: true, limit: "1", "browser-profile": ".cache/test-profile" },
      {
        createChromeHtmlFetcher: vi.fn().mockResolvedValue({
          fetchHtml: browserFetchHtml,
          close,
        }),
        fetchBranchDetailsFromSite,
        cwd: () => "/tmp/gymory-go24-test",
        log: vi.fn(),
      }
    );

    expect(fetchBranchDetailsFromSite).toHaveBeenCalledWith("1", browserFetchHtml);
    expect(close).toHaveBeenCalledOnce();
    expect(result).toBe(details);
  });
});
