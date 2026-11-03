#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const statuses = new Set(['ambiguous_model','candidate_requires_review','model_verified','model_verified_image_missing','unresolved']);
function httpUrl(value) {
  if (!value) return null;
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Invalid image/source URL');
  return value;
}
export function buildOfficialResearchPlan(catalog) {
  const seen = new Set();
  return catalog.equipment.map(entry => {
    const key = `247-fitness:${entry.inventory_id}`;
    if (!Number.isSafeInteger(entry.inventory_id) || seen.has(key)) throw new Error('Invalid/duplicate inventory ID');
    seen.add(key);
    let status = entry.status;
    if (status === 'model_verified_image_unavailable') status = 'model_verified_image_missing';
    if (status === 'name_indexed_image_missing') status = 'candidate_requires_review';
    if (!statuses.has(status)) throw new Error(`Unknown research status: ${status}`);
    // Preserve official candidates as leads, with their uncertainty in status/note.
    const candidate = entry.candidates?.[0];
    const images = [];
    if (entry.source_image_url) images.push({role:'captured',url:httpUrl(entry.source_image_url),source_url:null});
    const official = entry.official_image_url || candidate?.image_url;
    if (official) images.push({role:'official',url:httpUrl(official),source_url:httpUrl(entry.individual_review?.image_evidence_url || entry.official_product_url || candidate?.product_url)});
    return {
      p_external_id:key,p_source_model:entry.source_model,
      p_research:{name:entry.official_name || candidate?.name || null,
        captured_name:entry.source_name || null,captured_name_zh:entry.source_names?.['zh-HK'] || null,
        ...(entry.official_name_zh ? {name_zh:entry.official_name_zh} : {}),
        model:entry.official_model || null,product_url:httpUrl(entry.official_product_url || candidate?.product_url),
        status,note:entry.configuration_note || entry.reason || null},p_images:images,
    };
  });
}

export async function importOfficialResearch(plan, request) {
  const counts = {imported:0,skipped_verified:0};
  for (const payload of plan) {
    const result = await request(payload);
    if (!(result in counts)) throw new Error(`Unexpected import result for ${payload.p_external_id}`);
    counts[result] += 1;
  }
  return counts;
}

async function main(args) {
  for (let i=0;i<args.length;i++) {
    if(args[i]==='--env-file') { const file=args[++i];if(!file || file.startsWith('--')) throw new Error('Missing env file');process.loadEnvFile(file); }
    else if(args[i]!=='--upsert') throw new Error(`Unknown argument: ${args[i]}`);
  }
  const catalog=JSON.parse(await readFile('data/equipments/247-fitness-hk-official-catalog.json','utf8'));
  const plan=buildOfficialResearchPlan(catalog);
  console.log(JSON.stringify({equipment:plan.length,images:plan.reduce((n,row)=>n+row.p_images.length,0),mode:args.includes('--upsert')?'upsert':'dry-run'}));
  if(!args.includes('--upsert')) return;
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
  if(!base || !key) throw new Error('Missing Supabase URL/secret key');
  const results=await importOfficialResearch(plan,async payload=>{
    const response=await fetch(`${base}/rest/v1/rpc/import_equipment_official_research`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!response.ok) throw new Error(`Import ${payload.p_external_id}: ${response.status} ${await response.text()}`);
    return response.json();
  });
  console.log(JSON.stringify(results));
}
if(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
