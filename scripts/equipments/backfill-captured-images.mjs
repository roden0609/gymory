#!/usr/bin/env node
// Run after migration 0076. Never changes public images or review metadata.
import { createHash } from 'node:crypto';
const args = process.argv.slice(2);
const envIndex = args.indexOf('--env-file');
if (envIndex < 0 || !args[envIndex + 1]) throw Error('Pass --env-file explicitly');
process.loadEnvFile(args[envIndex + 1]);
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!base || !key) throw Error('Missing Supabase credentials');
const headers = { apikey: key, Authorization: `Bearer ${key}` };
async function api(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!response.ok) throw Error(`Supabase HTTP ${response.status}`);
  return response;
}
let offset = 0, uploaded = 0, failed = 0;
for (;;) {
  const rows = await (await api(`/rest/v1/equipment_captured_images?select=id,equipment_id,source_url,storage_path&order=id&offset=${offset}&limit=100`)).json();
  if (!rows.length) break;
  for (let start = 0; start < rows.length; start += 8) {
    await Promise.all(rows.slice(start, start + 8).map(async row => {
    try {
      if (row.storage_path) return;
      if (!args.includes('--apply')) return;
      const url = new URL(row.source_url);
      if (url.protocol !== 'https:' || url.hostname !== 'oss-hk.247fitness.hk') throw Error('Unexpected source host');
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw Error(`Source HTTP ${response.status}`);
      const limit = 20 * 1024 * 1024;
      if (Number(response.headers.get('content-length')) > limit) throw Error('Image too large');
      const chunks = []; let size = 0;
      for await (const chunk of response.body) { size += chunk.length; if (size > limit) throw Error('Image too large'); chunks.push(chunk); }
      const bytes = Buffer.concat(chunks);
      const kind = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? ['jpg', 'image/jpeg']
        : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? ['png', 'image/png']
        : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' ? ['webp','image/webp']
        : /^GIF8[79]a/.test(bytes.toString('ascii',0,6)) ? ['gif','image/gif'] : null;
      if (!kind) throw Error('Unsupported image bytes');
      const path = `${row.equipment_id}/${row.id}/${createHash('sha256').update(bytes).digest('hex')}.${kind[0]}`;
      await api(`/storage/v1/object/equipment-captured-images/${path}`, { method: 'POST', headers: { 'Content-Type': kind[1], 'x-upsert': 'true' }, body: bytes });
      // Verify actual stored bytes before linking the row.
      const stored = Buffer.from(await (await api(`/storage/v1/object/authenticated/equipment-captured-images/${path}`)).arrayBuffer());
      if (!stored.equals(bytes)) throw Error('Storage verification failed');
      await api(`/rest/v1/equipment_captured_images?id=eq.${row.id}&storage_path=is.null`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storage_path: path }) });
      uploaded++;
    } catch (error) { failed++; console.error(JSON.stringify({ id: row.id, error: error.message })); }
    }));
  }
  offset += rows.length;
  console.log(JSON.stringify({ processed: offset, uploaded, failed, dryRun: !args.includes('--apply') }));
}
if (failed) process.exitCode = 1;
