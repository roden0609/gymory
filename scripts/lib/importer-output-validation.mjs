export function assertNotChallengeHtml(html, source) {
  if (
    /\.well-known\/sgcaptcha|cf-chl-|challenge-platform|<title[^>]*>\s*captcha|verify you are human/i.test(
      html
    )
  ) {
    throw new Error(`${source} returned a CAPTCHA or bot challenge`);
  }
}

export function validateImporterDetails(details, { label, getSourceId }) {
  if (!Array.isArray(details) || details.length === 0) {
    throw new Error(`${label} details did not contain any records`);
  }

  const sourceIds = details.map((detail, index) => {
    const value = getSourceId(detail);
    const sourceId = value === null || value === undefined ? "" : String(value).trim();
    if (!sourceId) {
      throw new Error(`${label} detail at index ${index} is missing a required source identifier`);
    }
    return sourceId;
  });

  if (new Set(sourceIds).size !== sourceIds.length) {
    throw new Error(`${label} details contain duplicate source identifiers`);
  }
}

export function validateImporterRows(rows, label) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${label} mapping did not produce any rows`);
  }

  const slugs = rows.map((row, index) => {
    const slug = typeof row?.slug === "string" ? row.slug.trim() : "";
    if (!slug) {
      throw new Error(`${label} row at index ${index} is missing a slug`);
    }
    return slug;
  });

  if (new Set(slugs).size !== slugs.length) {
    throw new Error(`${label} mapping produced duplicate gym slugs`);
  }
}
