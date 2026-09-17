export const PUBLIC_INVENTORY_STATUSES = [
  "admin_verified",
  "owner_verified",
] as const;

export function intersectIds(current: Set<string> | null, next: Iterable<string>) {
  const nextSet = new Set(next);
  if (current === null) return nextSet;
  return new Set([...current].filter((id) => nextSet.has(id)));
}

export function combineBrandGymMatches({
  modelGymIds,
  legacyBrandGymIds,
  hasMachineOrCategoryFilter,
}: {
  modelGymIds: Iterable<string>;
  legacyBrandGymIds: Iterable<string>;
  hasMachineOrCategoryFilter: boolean;
}) {
  const matches = new Set(modelGymIds);
  if (!hasMachineOrCategoryFilter) {
    for (const gymId of legacyBrandGymIds) matches.add(gymId);
  }
  return matches;
}
