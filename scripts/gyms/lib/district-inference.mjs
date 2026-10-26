const AMBIGUOUS_PHRASE_CONTAINERS = new Map([
  ["kwai fong", ["lan kwai fong"]],
]);

export function inferDistrictFromSources({
  structured = [],
  addresses = [],
  fallback = [],
  districts,
}) {
  for (const values of [structured, [...addresses, ...fallback]]) {
    const match = findMostSpecificDistrict(values, districts);
    if (match) return match;
  }
  return null;
}

function findMostSpecificDistrict(values, districts) {
  const text = values.filter(Boolean).join(" ").normalize("NFKC").toLowerCase();
  if (!text) return null;

  const matches = districts.flatMap(({ code, keywords }, districtIndex) =>
    keywords
      .filter((keyword) => containsDistrictKeyword(text, keyword))
      .map((keyword) => ({ code, keyword, districtIndex }))
  );
  matches.sort(
    (left, right) =>
      right.keyword.length - left.keyword.length ||
      left.districtIndex - right.districtIndex
  );
  return matches[0]?.code ?? null;
}

function containsDistrictKeyword(text, keyword) {
  const normalizedKeyword = keyword.normalize("NFKC").toLowerCase();
  const containers = AMBIGUOUS_PHRASE_CONTAINERS.get(normalizedKeyword) ?? [];
  const withoutContainers = containers.reduce(
    (value, phrase) => value.replaceAll(phrase, " "),
    text
  );
  return withoutContainers.includes(normalizedKeyword);
}
