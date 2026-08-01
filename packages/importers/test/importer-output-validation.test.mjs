import { describe, expect, it } from "vitest";

import {
  assertNotChallengeHtml,
  validateImporterDetails,
  validateImporterRows,
} from "../../../scripts/lib/importer-output-validation.mjs";

describe("shared importer output validation", () => {
  it.each([
    ['<meta http-equiv="refresh" content="0;/.well-known/sgcaptcha/">'],
    ["<title>CAPTCHA</title>"],
    ['<script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script>'],
    ["<h1>Verify you are human</h1>"],
  ])("rejects a successful HTML bot-challenge response", (html) => {
    expect(() => assertNotChallengeHtml(html, "Test source")).toThrow(
      "CAPTCHA or bot challenge"
    );
  });

  it("accepts ordinary source HTML", () => {
    expect(() => assertNotChallengeHtml("<h1>Gym list</h1>", "Test source")).not.toThrow();
  });

  it("rejects empty, missing-ID, and duplicate detail records", () => {
    const options = { label: "Test importer", getSourceId: (detail) => detail.id };

    expect(() => validateImporterDetails([], options)).toThrow("did not contain any records");
    expect(() => validateImporterDetails([{}], options)).toThrow(
      "missing a required source identifier"
    );
    expect(() => validateImporterDetails([{ id: 1 }, { id: "1" }], options)).toThrow(
      "duplicate source identifiers"
    );
  });

  it("rejects empty, missing-slug, and duplicate mapped rows", () => {
    expect(() => validateImporterRows([], "Test importer")).toThrow(
      "did not produce any rows"
    );
    expect(() => validateImporterRows([{}], "Test importer")).toThrow("missing a slug");
    expect(() => validateImporterRows([{ slug: "same" }, { slug: "same" }], "Test importer"))
      .toThrow("duplicate gym slugs");
  });
});
