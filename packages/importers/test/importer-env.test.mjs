import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { loadImporterEnv } from "../../../scripts/gyms/lib/importer-env.mjs";

let directory;
beforeEach(async () => { directory = await mkdtemp(path.join(os.tmpdir(), "gymory-env-")); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

it("keeps explicit shell configuration when no file is supplied", async () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://shell.invalid", SUPABASE_SECRET_KEY: "shell" };
  await loadImporterEnv({}, env);
  expect(env).toEqual({ NEXT_PUBLIC_SUPABASE_URL: "https://shell.invalid", SUPABASE_SECRET_KEY: "shell" });
});

it.each(["dev", "prod", "local"])("uses the selected %s file instead of ambient credentials", async (target) => {
  const file = path.join(directory, `${target}.env`);
  const url = target === "local" ? "http://127.0.0.1:54321" : `https://${target}.invalid`;
  await writeFile(file, `NEXT_PUBLIC_SUPABASE_URL=${url}\nSUPABASE_SECRET_KEY="${target}-key"\nMAPBOX_PRIVATE_TOKEN=map-token\n`);
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://wrong.invalid", SUPABASE_SECRET_KEY: "wrong" };
  await loadImporterEnv({ "env-file": file }, env);
  expect(env).toEqual({ NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: `${target}-key`, MAPBOX_PRIVATE_TOKEN: "map-token" });
});

it.each([
  "NEXT_PUBLIC_SUPABASE_URL=https://dev.invalid",
  "SUPABASE_SECRET_KEY=key",
  "NEXT_PUBLIC_SUPABASE_URL=invalid\nSUPABASE_SECRET_KEY=key",
  "NEXT_PUBLIC_SUPABASE_URL=https://user:secret@dev.invalid\nSUPABASE_SECRET_KEY=key",
])("fails without changing credentials for incomplete or invalid files", async (contents) => {
  const file = path.join(directory, "invalid.env");
  await writeFile(file, contents);
  const env = { SUPABASE_SECRET_KEY: "ambient" };
  await expect(loadImporterEnv({ "env-file": file }, env)).rejects.toThrow();
  expect(env).toEqual({ SUPABASE_SECRET_KEY: "ambient" });
});

it("rejects missing files and flag values instead of falling back", async () => {
  await expect(loadImporterEnv({ "env-file": path.join(directory, "missing") }, {})).rejects.toThrow("ENOENT");
  for (const value of [true, "", " "]) {
    await expect(loadImporterEnv({ "env-file": value }, {})).rejects.toThrow("Missing value");
  }
});
