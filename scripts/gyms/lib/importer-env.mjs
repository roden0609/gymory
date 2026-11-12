import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";

// Explicit files are authoritative: never combine a target URL with ambient keys.
export async function loadImporterEnv(args, env = process.env) {
  if (!Object.hasOwn(args, "env-file")) return;
  const file = args["env-file"];
  if (typeof file !== "string" || !file.trim()) {
    throw new Error("Missing value for --env-file <path>");
  }
  const values = parseEnv(await readFile(file, "utf8"));
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"]) {
    if (!values[key]?.trim()) throw new Error(`Env file requires ${key}`);
  }
  let url;
  try { url = new URL(values.NEXT_PUBLIC_SUPABASE_URL); } catch {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL in env file");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL in env file");
  }
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "MAPBOX_PRIVATE_TOKEN", "NEXT_PUBLIC_MAPBOX_TOKEN"]) {
    if (Object.hasOwn(values, key)) env[key] = values[key];
  }
}
