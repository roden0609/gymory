export async function upsertGymsWithSubmissions({
  rows,
  actorType,
  supabaseUrl,
  apiKey,
}) {
  const equipmentMappings = await fetchEquipmentMappings({ supabaseUrl, apiKey });

  for (const row of rows) {
    const { gymRow, inventoryItems } = splitNormalizedEquipment(
      row,
      equipmentMappings
    );
    const existing = await fetchGymBySlug({
      supabaseUrl,
      apiKey,
      slug: gymRow.slug,
    });

    if (!existing) {
      const inserted = await insertGym({ supabaseUrl, apiKey, row: gymRow });
      await insertSubmission({
        supabaseUrl,
        apiKey,
        gymId: inserted.id,
        submissionType: "add_gym",
        actionType: "I",
        actorType,
        payload: { snapshot: inserted },
        changedFields: buildChangedFields(null, inserted),
      });
      if (inventoryItems.length > 0) {
        await applyEquipmentImportPatch({
          supabaseUrl,
          apiKey,
          gymId: inserted.id,
          inventoryItems,
          slug: gymRow.slug,
        });
      }
      continue;
    }

    const nextRow = buildUpsertRow(existing, gymRow, actorType);
    const changedFields = buildChangedFields(existing, nextRow);
    const changedInventoryItems =
      inventoryItems.length > 0
        ? await filterChangedInventoryItems({
            supabaseUrl,
            apiKey,
            gymId: existing.id,
            inventoryItems,
          })
        : [];

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
        payload: { snapshot: updated },
        changedFields,
      });
    }

    if (changedInventoryItems.length > 0) {
      await applyEquipmentImportPatch({
        supabaseUrl,
        apiKey,
        gymId: existing.id,
        inventoryItems: changedInventoryItems,
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

async function fetchEquipmentMappings({ supabaseUrl, apiKey }) {
  const url = new URL(`${supabaseUrl}/rest/v1/equipment_legacy_field_mappings`);
  url.searchParams.set(
    "select",
    "legacy_field,equipment_code,value_kind,precedence"
  );
  url.searchParams.set("order", "precedence.asc,legacy_field.asc");

  const response = await fetch(url, {
    headers: buildHeaders(apiKey),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase equipment mapping fetch failed: ${response.status} ${await response.text()}`
    );
  }

  const mappings = await response.json();
  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw new Error(
      "No normalized equipment mappings found. Apply migration 0043 before importing."
    );
  }

  return mappings;
}

export function splitNormalizedEquipment(row, mappings) {
  const gymRow = { ...row };
  const valuesByCode = new Map();

  for (const mapping of mappings) {
    delete gymRow[mapping.legacy_field];
    const value = row[mapping.legacy_field];
    if (value === null || value === undefined) continue;

    const values = valuesByCode.get(mapping.equipment_code) ?? {
      presenceSeen: false,
      presenceTrue: false,
      presenceFalse: false,
      quantity: null,
    };

    if (mapping.value_kind === "presence" && typeof value === "boolean") {
      values.presenceSeen = true;
      values.presenceTrue ||= value;
      values.presenceFalse ||= !value;
    } else if (
      mapping.value_kind === "quantity" &&
      Number.isInteger(value) &&
      value >= 0
    ) {
      values.quantity = Math.max(values.quantity ?? 0, value);
    }

    valuesByCode.set(mapping.equipment_code, values);
  }

  const unmappedEquipmentFields = Object.keys(gymRow).filter(
    (field) =>
      !AMENITY_FIELDS.has(field) &&
      (field.startsWith("has_") || field.endsWith("_count"))
  );
  if (unmappedEquipmentFields.length > 0) {
    throw new Error(
      `Importer contains equipment fields missing from the DB mapping manifest: ${unmappedEquipmentFields.join(", ")}`
    );
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

  return inventoryItems.filter((item) => {
    const existing = existingByCode.get(item.equipmentCode);
    return (
      !existing ||
      existing.is_present !== item.isPresent ||
      existing.quantity !== (item.quantity ?? null)
    );
  });
}

async function applyEquipmentImportPatch({
  supabaseUrl,
  apiKey,
  gymId,
  inventoryItems,
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

function buildUpsertRow(existing, row, actorType) {
  if (!existing || actorType !== "import") return row;

  const nextRow = { ...row };
  for (const [key, value] of Object.entries(nextRow)) {
    if (value !== null) continue;
    if (existing[key] === null || existing[key] === undefined) continue;
    delete nextRow[key];
  }

  return nextRow;
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

function buildChangedFields(existing, nextRow) {
  const changed = {};

  for (const [key, value] of Object.entries(nextRow)) {
    if (
      key === "data_source" ||
      key === "created_at" ||
      key === "updated_at" ||
      key === "last_reported_at"
    ) {
      continue;
    }
    if (!existing || JSON.stringify(existing[key]) !== JSON.stringify(value)) {
      changed[key] = value;
    }
  }

  return Object.keys(changed).length > 0 ? changed : null;
}
