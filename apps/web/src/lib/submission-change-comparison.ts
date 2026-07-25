export type FieldChangeComparison = {
  before: unknown;
  after: unknown;
  beforeCaptured?: boolean;
};

export type ChangeComparison = Record<string, FieldChangeComparison>;

type JsonRecord = Record<string, unknown>;

export function buildChangeComparison(
  before: JsonRecord | null | undefined,
  after: JsonRecord | null | undefined
): ChangeComparison {
  if (!after) return {};

  const comparison: ChangeComparison = {};
  for (const [field, afterValue] of Object.entries(after)) {
    const beforeValue = before?.[field] ?? null;
    if (isEqualJsonValue(beforeValue, afterValue)) continue;
    comparison[field] = {
      before: beforeValue,
      after: afterValue,
      beforeCaptured: true,
    };
  }
  return comparison;
}

export function mergeChangeComparisons(
  ...comparisons: Array<ChangeComparison | null | undefined>
): ChangeComparison {
  return Object.assign({}, ...comparisons.filter(Boolean));
}

export function resolveChangeComparison(
  payload: JsonRecord,
  changedFields: JsonRecord | null
): ChangeComparison {
  if (isChangeComparison(payload.changeComparison)) {
    return payload.changeComparison;
  }

  if (isPlainRecord(payload.before) && isPlainRecord(payload.after)) {
    return buildChangeComparison(payload.before, payload.after);
  }

  if (!changedFields) return {};

  return Object.fromEntries(
    Object.entries(changedFields).map(([field, after]) => [
      field,
      {
        before: null,
        after,
        beforeCaptured: false,
      },
    ])
  );
}

export function isEqualJsonValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((item, index) => isEqualJsonValue(item, right[index]));
  }

  if (isPlainRecord(left) || isPlainRecord(right)) {
    if (!isPlainRecord(left) || !isPlainRecord(right)) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (!isEqualJsonValue(leftKeys, rightKeys)) return false;
    return leftKeys.every((key) => isEqualJsonValue(left[key], right[key]));
  }

  return false;
}

function isChangeComparison(value: unknown): value is ChangeComparison {
  if (!isPlainRecord(value)) return false;
  return Object.values(value).every(
    (entry) =>
      isPlainRecord(entry) &&
      Object.prototype.hasOwnProperty.call(entry, "before") &&
      Object.prototype.hasOwnProperty.call(entry, "after")
  );
}

function isPlainRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
