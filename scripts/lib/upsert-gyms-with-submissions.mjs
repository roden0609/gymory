export async function upsertGymsWithSubmissions({
  rows,
  actorType,
  supabaseUrl,
  apiKey,
}) {
  for (const row of rows) {
    const existing = await fetchGymBySlug({ supabaseUrl, apiKey, slug: row.slug });

    if (!existing) {
      const inserted = await insertGym({ supabaseUrl, apiKey, row });
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
      continue;
    }

    const changedFields = buildChangedFields(existing, row);
    if (!changedFields) continue;

    const updated = await updateGym({
      supabaseUrl,
      apiKey,
      gymId: existing.id,
      row,
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
}

async function fetchGymBySlug({ supabaseUrl, apiKey, slug }) {
  const url = new URL(`${supabaseUrl}/rest/v1/gyms`);
  url.searchParams.set("slug", `eq.${slug}`);
  url.searchParams.set("select", "*");

  const response = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.status} ${await response.text()}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
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
