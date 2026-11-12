import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { main } from '../../../scripts/equipments/import-247-equipment.mjs';

let directory;
beforeEach(async () => { directory = await mkdtemp(path.join(os.tmpdir(), 'equipment-env-')); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

it('rejects an incomplete explicit file before reading the plan or accessing the database', async () => {
  const file = path.join(directory, 'incomplete.env');
  await writeFile(file, 'NEXT_PUBLIC_SUPABASE_URL=https://dev.invalid\n');
  await expect(main(['--env-file', file, '--upsert'])).rejects.toThrow('Env file requires SUPABASE_SECRET_KEY');
});

it('rejects a missing explicit file instead of using ambient credentials', async () => {
  await expect(main(['--env-file', path.join(directory, 'missing.env'), '--upsert'])).rejects.toThrow('ENOENT');
});
