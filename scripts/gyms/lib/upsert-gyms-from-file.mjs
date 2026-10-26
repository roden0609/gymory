import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateImporterRows } from "./importer-output-validation.mjs";

// This mode consumes mapped gym rows, not source detail snapshots.
export async function upsertGymsFromFile({
  args,
  upsertRows,
  cwd = process.cwd(),
  log = console.log,
  hyrox = false,
}) {
  const file = args["upsert-file"];
  if (typeof file !== "string" || !file.trim()) {
    throw new Error("Missing value for --upsert-file <path>");
  }
  const otherArgs = Object.keys(args).filter((key) => key !== "upsert-file");
  if (otherArgs.length) {
    throw new Error(
      `--upsert-file must be used alone; remove ${otherArgs.map((key) => `--${key}`).join(", ")}`
    );
  }

  const inputPath = path.resolve(cwd, file);
  const rows = JSON.parse(await readFile(inputPath, "utf8"));
  validateImporterRows(rows, "Gym JSON file");
  const partnerIds = new Set();
  for (const [index, row] of rows.entries()) {
    for (const field of ["name", "slug", "district_code", "country_code"]) {
      if (typeof row[field] !== "string" || !row[field].trim()) {
        throw new Error(`Gym JSON row ${index} requires a non-empty ${field}`);
      }
    }
    if (row.slug !== row.slug.trim()) {
      throw new Error(`Gym JSON row ${index} has whitespace around its slug`);
    }
    if (row.country_code !== "HK" || !/^HK-[A-Z]+$/.test(row.district_code)) {
      throw new Error(`Gym JSON row ${index} requires HK country and district codes`);
    }
    if (hyrox) {
      if (
        row.is_hyrox_official !== true ||
        typeof row.hyrox_partner_id !== "string" ||
        !row.hyrox_partner_id.trim() ||
        typeof row.hyrox_source_url !== "string" ||
        !row.hyrox_source_url.trim() ||
        typeof row.hyrox_source_synced_at !== "string" ||
        !Number.isFinite(Date.parse(row.hyrox_source_synced_at))
      ) {
        throw new Error(`Gym JSON row ${index} requires valid HYROX partner metadata`);
      }
      const id = row.hyrox_partner_id.trim();
      if (partnerIds.has(id)) {
        throw new Error(`Gym JSON contains duplicate HYROX partner ID: ${id}`);
      }
      partnerIds.add(id);
    }
  }

  const result = await upsertRows(rows);
  log(`Imported ${rows.length} gym rows from ${inputPath} into Supabase.`);
  return { rows, inputPath, upserted: true, result };
}
