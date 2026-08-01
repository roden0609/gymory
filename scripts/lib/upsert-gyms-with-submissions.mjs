export async function upsertGymsWithSubmissions({
  rows,
  actorType,
  supabaseUrl,
  apiKey,
}) {
  for (const row of rows) {
    const { gymRow, inventoryItems } = splitNormalizedEquipment(row);
    const existing = await fetchGymBySlug({
      supabaseUrl,
      apiKey,
      slug: gymRow.slug,
    });

    if (!existing) {
      const inserted = await insertGym({ supabaseUrl, apiKey, row: gymRow });
      const changedFields = buildChangedFields(null, inserted);
      await insertSubmission({
        supabaseUrl,
        apiKey,
        gymId: inserted.id,
        submissionType: "add_gym",
        actionType: "I",
        actorType,
        payload: {
          snapshot: inserted,
          changeComparison: buildChangeComparison(null, changedFields),
        },
        changedFields,
      });
      if (inventoryItems.length > 0) {
        await applyEquipmentImportPatch({
          supabaseUrl,
          apiKey,
          gymId: inserted.id,
          inventoryItems,
          changeComparison: buildEquipmentChangeComparison(
            new Map(),
            inventoryItems
          ),
          slug: gymRow.slug,
        });
      }
      continue;
    }

    const nextRow = buildUpsertRow(existing, gymRow, actorType);
    const changedFields = buildChangedFields(existing, nextRow);
    const changedInventory =
      inventoryItems.length > 0
        ? await filterChangedInventoryItems({
            supabaseUrl,
            apiKey,
            gymId: existing.id,
            inventoryItems,
          })
        : { inventoryItems: [], changeComparison: {} };

    if (changedFields) {
      const updated = await updateGym({
        supabaseUrl,
        apiKey,
        gymId: existing.id,
        row: nextRow,
      });

      await insertSubmission({
        supabaseUrl,
        apiKey,
        gymId: existing.id,
        submissionType: "edit_gym_info",
        actionType: "U",
        actorType,
        payload: {
          snapshot: updated,
          changeComparison: buildChangeComparison(existing, changedFields),
        },
        changedFields,
      });
    }

    if (changedInventory.inventoryItems.length > 0) {
      await applyEquipmentImportPatch({
        supabaseUrl,
        apiKey,
        gymId: existing.id,
        inventoryItems: changedInventory.inventoryItems,
        changeComparison: changedInventory.changeComparison,
        slug: gymRow.slug,
      });
    }
  }
}

const AMENITY_FIELDS = new Set([
  "has_washroom",
  "has_bathroom",
  "has_changing_room",
  "has_free_water",
  "has_dry_sauna",
  "has_wet_sauna",
  "has_ice_bath",
]);

const EQUIPMENT_CODE_OVERRIDES = {
  has_battle_rope: "battle_rope",
  has_battle_ropes: "battle_rope",
  has_farmer_handles: "farmer_handles",
  has_farmers_handles: "farmer_handles",
  lat_pulldown_count: "lat_pulldown_machine",
  chest_press_count: "chest_press_machine",
  leg_press_count: "leg_press_machine",
};

export function splitNormalizedEquipment(row) {
  const gymRow = { ...row };
  const valuesByCode = new Map();

  for (const [field, value] of Object.entries(row)) {
    if (!isEquipmentCompatibilityField(field)) continue;

    delete gymRow[field];
    if (value === null || value === undefined) continue;

    const equipmentCode =
      EQUIPMENT_CODE_OVERRIDES[field] ??
      (field.startsWith("has_")
        ? field.slice(4)
        : field.replace(/_count$/, ""));
    const values = valuesByCode.get(equipmentCode) ?? {
      presenceSeen: false,
      presenceTrue: false,
      presenceFalse: false,
      quantity: null,
    };

    if (field.startsWith("has_") && typeof value === "boolean") {
      values.presenceSeen = true;
      values.presenceTrue ||= value;
      values.presenceFalse ||= !value;
    } else if (
      field.endsWith("_count") &&
      Number.isInteger(value) &&
      value >= 0
    ) {
      values.quantity = Math.max(values.quantity ?? 0, value);
    }

    valuesByCode.set(equipmentCode, values);
  }

  const inventoryItems = [];
  for (const [equipmentCode, values] of [...valuesByCode].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (values.quantity !== null && values.quantity > 0) {
      inventoryItems.push({
        equipmentCode,
        isPresent: true,
        quantity: values.quantity,
      });
    } else if (values.quantity === 0 && values.presenceTrue) {
      inventoryItems.push({ equipmentCode, isPresent: true });
    } else if (values.presenceTrue) {
      inventoryItems.push({
        equipmentCode,
        isPresent: true,
        ...(values.quantity === null ? {} : { quantity: values.quantity }),
      });
    } else if (values.presenceFalse || values.quantity === 0) {
      inventoryItems.push({
        equipmentCode,
        isPresent: false,
        ...(values.quantity === null ? {} : { quantity: values.quantity }),
      });
    }
  }

  return { gymRow, inventoryItems };
}

function isEquipmentCompatibilityField(field) {
  if (AMENITY_FIELDS.has(field)) return false;
  return field.startsWith("has_") || field.endsWith("_count");
}

async function filterChangedInventoryItems({
  supabaseUrl,
  apiKey,
  gymId,
  inventoryItems,
}) {
  const url = new URL(`${supabaseUrl}/rest/v1/gym_equipment_inventory`);
  url.searchParams.set("gym_id", `eq.${gymId}`);
  url.searchParams.set("select", "equipment_code,is_present,quantity");

  const response = await fetch(url, {
    headers: buildHeaders(apiKey),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase inventory fetch failed: ${response.status} ${await response.text()}`
    );
  }

  const existingItems = await response.json();
  const existingByCode = new Map(
    (Array.isArray(existingItems) ? existingItems : []).map((item) => [
      item.equipment_code,
      item,
    ])
  );

  const changedInventoryItems = inventoryItems.filter((item) => {
    const existing = existingByCode.get(item.equipmentCode);
    return (
      !existing ||
      existing.is_present !== item.isPresent ||
      existing.quantity !== (item.quantity ?? null)
    );
  });

  return {
    inventoryItems: changedInventoryItems,
    changeComparison: buildEquipmentChangeComparison(
      existingByCode,
      changedInventoryItems
    ),
  };
}

async function applyEquipmentImportPatch({
  supabaseUrl,
  apiKey,
  gymId,
  inventoryItems,
  changeComparison,
  slug,
}) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/apply_gym_equipment_import_patch`,
    {
      method: "POST",
      headers: {
        ...buildHeaders(apiKey),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        p_target_gym_id: gymId,
        p_inventory_items: inventoryItems,
        p_source_payload: {
          schemaVersion: 2,
          equipment: inventoryItems,
          changeComparison,
          source: { type: "import", slug },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Supabase normalized equipment import failed: ${response.status} ${await response.text()}`
    );
  }
}

export function buildUpsertRow(existing, row, actorType) {
  if (!existing || actorType !== "import") return row;

  const nextRow = { ...row };
  for (const [key, value] of Object.entries(nextRow)) {
    if (value !== null) continue;
    if (existing[key] === null || existing[key] === undefined) continue;
    delete nextRow[key];
  }

  for (const field of ["address", "address_zh"]) {
    if (isShortenedAddress(existing[field], nextRow[field])) {
      delete nextRow[field];
    }
  }

  return nextRow;
}

function isShortenedAddress(existingValue, importedValue) {
  if (typeof existingValue !== "string" || typeof importedValue !== "string") {
    return false;
  }

  const existing = normalizeAddressForComparison(existingValue);
  const imported = normalizeAddressForComparison(importedValue);
  return imported.length > 0 && imported.length < existing.length && existing.includes(imported);
}

function normalizeAddressForComparison(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[\s,，.。/\\\-–—'’"“”()（）]+/g, "");
}

async function fetchGymBySlug({ supabaseUrl, apiKey, slug }) {
  const url = new URL(`${supabaseUrl}/rest/v1/gyms`);
  url.searchParams.set("slug", `eq.${slug}`);
  url.searchParams.set("select", "*");

  const response = await fetch(url, {
    headers: buildHeaders(apiKey),
  });

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.status} ${await response.text()}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function buildHeaders(apiKey) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
}

async function insertGym({ supabaseUrl, apiKey, row }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/gyms`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(`Supabase insert failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

async function updateGym({ supabaseUrl, apiKey, gymId, row }) {
  const url = new URL(`${supabaseUrl}/rest/v1/gyms`);
  url.searchParams.set("id", `eq.${gymId}`);
  url.searchParams.set("select", "*");

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(`Supabase update failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

async function insertSubmission({
  supabaseUrl,
  apiKey,
  gymId,
  submissionType,
  actionType,
  actorType,
  payload,
  changedFields,
}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/gym_update_submissions`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      gym_id: gymId,
      submitted_by_user_id: null,
      submission_type: submissionType,
      status: "approved",
      payload,
      changed_fields: changedFields,
      action_type: actionType,
      actor_type: actorType,
      reviewed_by_user_id: null,
      reviewed_at: new Date().toISOString(),
      review_notes: null,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase submission insert failed: ${response.status} ${await response.text()}`
    );
  }
}

export function buildChangedFields(existing, nextRow) {
  const changed = {};

  for (const [key, value] of Object.entries(nextRow)) {
    if (
      key === "data_source" ||
      key === "created_at" ||
      key === "updated_at" ||
      key === "last_reported_at" ||
      key === "equipment_last_verified_at"
    ) {
      continue;
    }
    if (!existing || JSON.stringify(existing[key]) !== JSON.stringify(value)) {
      changed[key] = value;
    }
  }

  return Object.keys(changed).length > 0 ? changed : null;
}

export function buildChangeComparison(existing, changedFields) {
  if (!changedFields) return {};

  return Object.fromEntries(
    Object.entries(changedFields).map(([field, after]) => [
      field,
      {
        before: existing?.[field] ?? null,
        after,
        beforeCaptured: true,
      },
    ])
  );
}

export function buildEquipmentChangeComparison(existingByCode, inventoryItems) {
  return Object.fromEntries(
    inventoryItems.map((item) => {
      const existing = existingByCode.get(item.equipmentCode);
      return [
        `equipment.${item.equipmentCode}`,
        {
          before: existing
            ? {
                isPresent: existing.is_present,
                quantity: existing.quantity,
              }
            : null,
          after: {
            isPresent: item.isPresent,
            quantity: item.quantity ?? null,
          },
          beforeCaptured: true,
        },
      ];
    })
  );
}
