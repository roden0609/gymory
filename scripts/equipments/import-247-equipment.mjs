#!/usr/bin/env node
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const comparable = value => (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const brandAliases = { sportart: 'sportsart', matrix: 'matrix-fitness', rogue: 'rogue-fitness', concept2: 'concept2' };
export function brandSlug(name) { return brandAliases[comparable(name)] ?? slug(name); }

// Only explicit movement names are classified. Multi-function/unclear models
// remain Other and are listed for review instead of inventing a controlled type.
export function equipmentType(item) {
  const n = item.name.toLowerCase().replace(/extention/g, 'extension');
  if (/\/|\||\band\b|\bdual\b|\bcombo\b|\b3.way\b/.test(n)) return 'other_equipment';
  const rules = [
    [/dumbbell rack|barbell rack|discus rack|disk rack|weight tree|storage|accessory rack/, 'other_equipment'],
    [/smith/, 'smith_machine'], [/belt squat|pit shark/, 'belt_squat_machine'],
    [/hack squat/, 'hack_squat'], [/leg press|hip press/, 'leg_press_machine'],
    [/leg extension/, 'leg_extension_machine'], [/seated leg curl/, 'seated_leg_curl_machine'],
    [/lying leg curl|prone leg curl/, 'lying_leg_curl_machine'],
    [/pendulum squat|squat machine|power squat|v squat/, 'squat_machine'],
    [/hip thrust|glute drive|glute thrust/, 'hip_thrust_machine'],
    [/abductor|hip abduction/, 'hip_abductor_machine'], [/adductor|hip adduction/, 'hip_adductor_machine'],
    [/standing calf/, 'standing_calf_raise_machine'], [/seated calf/, 'seated_calf_raise_machine'],
    [/treadmill|\brunner\b/, 'treadmill'], [/ski.*erg/, 'ski_erg'],
    [/airbike|air bike|echo bike/, 'assault_bike'], [/bike|cycle|cycling|單車/, 'exercise_bike'],
    [/stair|stepmill|stepper|gauntlet|climber/, 'climber'],
    [/rowing|rower|ecorow|skillrow/, item.category_names.includes('Cardio') ? 'rower' : 'seated_row_machine'],
    [/pullover|pull.over/, 'pull_over_machine'], [/t.bar row/, 't_bar_row_machine'],
    [/lat pull|pulldown|lat machine/, 'lat_pulldown_machine'],
    [/\brow\b/, 'seated_row_machine'],
    [/roman chair|hyperextension|iperextension/, 'roman_chair'],
    [/back extension|low back/, 'back_extension_machine'],
    [/preacher|arm curl.*bench|curl bench/, 'preacher_curl_bench'],
    [/abdominal.*bench|crunch.*board|ab.*bench/, 'ab_crunch_bench'],
    [/abdominal|ab crunch/, 'ab_crunch_machine'],
    [/olympic incline bench/, 'incline_bench_rack'], [/olympic.*bench/, 'bench_rack'],
    [/bench/, 'bench'], [/power rack|half rack|full rack|squat rack|power cage/, 'rack'],
    [/standing lateral raise/, 'standing_lateral_raise_machine'],
    [/lateral raise|lateral deltoid/, 'lateral_raise_machine'],
    [/shoulder press|deltoid press/, 'shoulder_press_machine'],
    [/incline.*press|inclined.*press/, 'incline_chest_press_machine'],
    [/decline.*press/, 'decline_chest_press_machine'], [/chest press/, 'chest_press_machine'],
    [/chest.*fl[yi]|pectoral fly/, 'chest_fly_machine'],
    [/bicep.*curl|curling machine|arm curl/, 'bicep_curl_machine'],
    [/tricep.*extension|triceps machine/, 'tricep_extension_machine'],
    [/adjustable pulley|functional trainer|cable station|cable crossover/, 'cable_machine'],
    [/sled/, 'sled'], [/platform/, 'platform'],
  ];
  // An unspecified leg curl has no matching controlled generic type.
  if (/leg curl/.test(n) && !/seated|lying|prone/.test(n)) return 'other_equipment';
  return rules.find(([pattern]) => pattern.test(n))?.[1] ?? 'other_equipment';
}

export function buildPlan(baseline, stores) {
  const byId = new Map();
  for (const gym of baseline) {
    const id = Number(gym.slug.match(/-(\d+)$/)?.[1]);
    if (!id || byId.has(id)) throw new Error(`Invalid/duplicate baseline store ID: ${gym.slug}`);
    byId.set(id, gym);
  }
  const equipment = new Map(), gyms = [], seen = new Set();
  for (const store of stores) {
    if (seen.has(store.store_id)) throw new Error(`Duplicate store ${store.store_id}`);
    seen.add(store.store_id);
    const gym = byId.get(store.store_id);
    if (!gym) throw new Error(`Unmatched store ${store.store_id}`);
    if (!['source_api_complete', 'empty_in_source'].includes(store.status) || store.country_code !== 'HK' || store.row_count !== store.equipment.length) throw new Error(`Incomplete store ${store.store_id}`);
    const keys = new Set();
    for (const item of store.equipment) {
      if (!item.inventory_id || !item.brand || !item.name) throw new Error('Invalid equipment');
      const key = `247-fitness:${item.inventory_id}`;
      const record = { key, brand_slug: brandSlug(item.brand), brand_name: item.brand, name: item.name, name_zh: item.names?.['zh-HK'] ?? null, model_number: item.model || null, equipment_type_code: equipmentType(item), source_url: store.source_url, captured_at: store.captured_at };
      const previous = equipment.get(key);
      if (previous && ['brand_slug', 'name', 'model_number', 'equipment_type_code'].some(field => previous[field] !== record[field])) throw new Error(`Conflicting source identity ${key}`);
      equipment.set(key, previous ?? record);
      keys.add(key);
    }
    gyms.push({ slug: gym.slug, store_id: store.store_id, equipment_keys: [...keys] });
  }
  return { gyms, equipment: [...equipment.values()], review: [...equipment.values()].filter(e => e.equipment_type_code === 'other_equipment').map(({ key, name, brand_name }) => ({ key, name, brand_name })) };
}

export async function persistPlan(plan, request, { verify = false, now = () => new Date() } = {}) {
  // Resolve all foreign keys and controlled types before any writes.
  const [gyms, brands, types, categories, models, inventory] = await Promise.all([
    request('gyms?select=id,slug'), request('equipment_brands?select=id,slug,name_en,aliases'),
    request('equipment_types?select=code,category,is_active'), request('equipment_categories?select=id,slug'),
    request('equipment?select=id,brand_id,slug,model_number,name,source_external_id,equipment_type_code'),
    request('gym_equipment_inventory?select=gym_id,equipment_id,source,notes,verified_status'),
  ]);
  const gymIds = new Map(gyms.map(g => [g.slug, g.id]));
  for (const gym of plan.gyms) if (!gymIds.has(gym.slug)) throw new Error(`Gym missing in database: ${gym.slug}`);
  for (const e of plan.equipment) {
    const type = types.find(t => t.code === e.equipment_type_code && t.is_active);
    if (!type || !categories.some(c => c.slug === type.category.replaceAll('_', '-'))) throw new Error(`Missing controlled type/category ${e.equipment_type_code}`);
  }
  const equipmentIds = new Map();
  for (const e of plan.equipment) {
    let brand = brands.find(b => b.slug === e.brand_slug || [b.name_en, ...(b.aliases ?? [])].some(n => comparable(n) === comparable(e.brand_name)));
    if (!brand) {
      [brand] = await request('equipment_brands?on_conflict=slug', [{ slug: e.brand_slug, name_en: e.brand_name }]);
      brands.push(brand);
    }
    let model = models.find(m => m.brand_id === brand.id && m.source_external_id === e.key);
    if (!model) {
      const candidates = models.filter(m => m.brand_id === brand.id && (comparable(m.name) === comparable(e.name) || (e.model_number && comparable(m.model_number) === comparable(e.model_number))));
      if (candidates.length > 1) throw new Error(`Ambiguous existing model ${e.key}`);
      model = candidates[0];
    }
    if (!model) {
      const type = types.find(t => t.code === e.equipment_type_code);
      const category = categories.find(c => c.slug === type.category.replaceAll('_', '-'));
      [model] = await request('equipment?on_conflict=brand_id,slug', [{ brand_id: brand.id, slug: `${slug(e.name) || 'equipment'}-247-${e.key.split(':')[1]}`, name: e.name, name_zh: e.name_zh, model_number: e.model_number, equipment_type_code: e.equipment_type_code, category_id: category.id, source_external_id: e.key, source_type: 'official', import_method: 'seed', source_url: e.source_url, imported_at: e.captured_at, status: 'active' }]);
      models.push(model);
    }
    equipmentIds.set(e.key, model.id);
  }
  const existing = new Map(inventory.map(i => [`${i.gym_id}:${i.equipment_id}`, i]));
  const verification = verify ? { verified_status: 'admin_verified', verified_at: now().toISOString() } : { verified_status: 'unverified' };
  let inserted = 0, verified = 0;
  for (const gym of plan.gyms) {
    const gymId = gymIds.get(gym.slug);
    const rows = [];
    for (const key of gym.equipment_keys) {
      const equipmentId = equipmentIds.get(key), pair = `${gymId}:${equipmentId}`;
      if (existing.has(pair)) {
        const row = existing.get(pair);
        // Only promote this importer's own unverified relationships. PATCH only
        // verification metadata so quantities, notes and user edits survive.
        if (verify && row.source === 'import' && row.verified_status === 'unverified' && row.notes?.startsWith('24/7 app inventory; 247-fitness:')) {
          const updated = await request(`gym_equipment_inventory?gym_id=eq.${gymId}&equipment_id=eq.${equipmentId}&source=eq.import&verified_status=eq.unverified&notes=like.24%2F7%20app%20inventory%3B%20247-fitness%3A*`, verification, { method: 'PATCH' });
          verified += updated.length;
          if (updated.length) row.verified_status = 'admin_verified';
        }
        continue;
      }
      existing.set(pair, { source: 'import', ...verification });
      rows.push({ gym_id: gymId, equipment_id: equipmentId, quantity: null, source: 'import', ...verification, notes: `24/7 app inventory; ${key}. Presence only; quantity unknown.` });
    }
    if (rows.length) { const created = await request('gym_equipment_inventory?on_conflict=gym_id,equipment_id', rows); inserted += created.length; if (verify) verified += created.length; }
  }
  return { inserted, verified, equipment: equipmentIds.size, gyms: plan.gyms.length };
}

export async function main(argv = process.argv.slice(2)) {
  const allowed = new Set(['--upsert', '--env-file', '--verify']);
  let envFile;
  for (let i = 0; i < argv.length; i++) {
    if (!allowed.has(argv[i])) throw new Error(`Unknown argument ${argv[i]}`);
    if (argv[i] === '--env-file') { envFile = argv[++i]; if (!envFile || envFile.startsWith('--')) throw new Error('Missing env file'); }
  }
  if (envFile) process.loadEnvFile(envFile);
  const baseline = JSON.parse(await readFile('data/gyms/247-fitness-hk-baseline.json', 'utf8'));
  const files = (await readdir('data/equipments/247-fitness-hk')).filter(f => f.endsWith('.json')).sort();
  const stores = await Promise.all(files.map(f => readFile(path.join('data/equipments/247-fitness-hk', f), 'utf8').then(JSON.parse)));
  const plan = buildPlan(baseline, stores);
  await writeFile('data/equipments/247-fitness-hk-import-plan.json', JSON.stringify(plan, null, 2) + '\n');
  console.log(JSON.stringify({ gyms: plan.gyms.length, equipment: plan.equipment.length, links: plan.gyms.reduce((n, g) => n + g.equipment_keys.length, 0), review: plan.review.length }));
  if (!argv.includes('--upsert')) return;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error('Missing Supabase URL/secret key');
  const request = async (resource, rows, { method = 'POST' } = {}) => {
    if (!rows) {
      const result = [];
      for (let offset = 0; ; offset += 1000) {
        const page = await fetch(`${base}/rest/v1/${resource}&offset=${offset}&limit=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        if (!page.ok) throw new Error(`Read ${resource.split('?')[0]}: ${page.status}`);
        const items = await page.json(); result.push(...items); if (items.length < 1000) return result;
      }
    }
    const response = await fetch(`${base}/rest/v1/${resource}`, { method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify(rows) });
    if (!response.ok) throw new Error(`Write ${resource.split('?')[0]}: ${response.status} ${await response.text()}`);
    const result = await response.json();
    if (method === 'POST' && !result.length && resource.startsWith('equipment')) throw new Error(`Concurrent catalog conflict; rerun import`);
    return result;
  };
  console.log(JSON.stringify(await persistPlan(plan, request, { verify: argv.includes('--verify') })));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch(error => { console.error(error.message); process.exitCode = 1; });
