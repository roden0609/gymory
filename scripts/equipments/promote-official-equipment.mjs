#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const FIELDS = ['source_external_id','model_number','captured_name','captured_name_zh','official_name','official_name_zh',
  'official_model_number','official_product_url','official_status','official_review_note'];
const HOSTS = {local:'127.0.0.1',dev:'yzvipswjmgcolaepqwoz.supabase.co',prod:'qgldameylaysgfsvytjh.supabase.co'};
const BUCKET='equipment-images';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pick = row => Object.fromEntries(FIELDS.map(key=>[key,row[key] ?? null]));
const trim = value => (value ?? '').trim();
const objectUrl = value => value.split('/').map(encodeURIComponent).join('/');
function promotionImageId(equipmentId,url) {
  const hash=sha(`${equipmentId}\n${url}`);
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

export function validateTarget(base, target) {
  const url=new URL(base);
  if(!HOSTS[target] || url.hostname!==HOSTS[target] || url.username || url.password || url.pathname!=='/' || url.search || url.hash
    || (target==='local' ? url.protocol!=='http:' || url.port!=='54321' : url.protocol!=='https:' || url.port)) throw Error('Environment URL does not match --target');
  return url.origin;
}

export function buildPromotionPlan(bundle, equipment, images, brands) {
  if(bundle.version!==1 || !Array.isArray(bundle.records) || !bundle.records.length) throw Error('Invalid bundle');
  const seen=new Set();
  return bundle.records.map(record=>{
    const source=record.machine,external=source?.source_external_id;
    if(!/^247-fitness:\d+$/.test(external) || seen.has(external)) throw Error('Invalid/duplicate bundle identity');
    seen.add(external);
    const matches=equipment.filter(e=>e.source_external_id===external);
    const row={external,record};
    if(matches.length!==1) return {...row,status:'conflict',reason:'Missing or duplicate target equipment'};
    const target=matches[0];
    if(brands.find(b=>b.id===target.brand_id)?.slug!==record.brand_slug || trim(target.model_number)!==trim(source.model_number))
      return {...row,status:'conflict',reason:'Brand/model mismatch'};
    if(target.official_verified_at) return {...row,status:'skipped_verified',reason:'Target admin approval preserved'};
    if(['captured_name','captured_name_zh'].some(k=>trim(target[k]) && target[k]!==source[k]))
      return {...row,status:'conflict',reason:'Captured provenance differs'};
    const image=record.image ? images.find(i=>i.equipment_id===target.id && i.image_role==='official' && i.url===record.image.url) : null;
    const imageId=image?.id ?? promotionImageId(target.id,record.image?.url ?? '');
    return {...row,status:'ready',target,image,imageId,
      storagePath:record.image ? `${target.id}/${imageId}/${record.image.sha256}.webp` : null};
  });
}

async function client(envFile,target) {
  // Read only the named file: ambient env vars must never redirect a promotion.
  const {parseEnv}=await import('node:util');
  const env=parseEnv(await fs.readFile(envFile,'utf8'));
  const base=validateTarget(env.NEXT_PUBLIC_SUPABASE_URL,target),key=env.SUPABASE_SECRET_KEY;
  if(!key) throw Error('Missing SUPABASE_SECRET_KEY in env file');
  const headers={apikey:key,Authorization:`Bearer ${key}`};
  async function request(route,{method='GET',body,raw=false,extra={}}={}) {
    const response=await fetch(base+route,{method,headers:{...headers,...(body && !raw?{'Content-Type':'application/json'}:{}),...extra},
      body:body ? raw?body:JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
    // Never print response bodies: hosted gateways may include credentials.
    if(!response.ok) throw Error(`${method} ${route.split('?')[0]} HTTP ${response.status}`);
    if(raw) return Buffer.from(await response.arrayBuffer());
    const text=await response.text();return text?JSON.parse(text):null;
  }
  async function all(table) {
    const rows=[];
    for(let offset=0;;offset+=500){const page=await request(`/rest/v1/${table}?select=*&order=id&limit=500&offset=${offset}`);rows.push(...page);if(page.length<500)return rows;}
  }
  return {base,request,all};
}

async function snapshot(api) {
  const [equipment,images,brands]=await Promise.all([api.all('equipment'),api.all('equipment_images'),api.all('equipment_brands')]);
  return {equipment,images,brands};
}

export async function readBundle(directory) {
  const bundle=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));
  for(const record of bundle.records ?? []) {
    if(!record.image) continue;
    const image=record.image;
    if(!/^[a-f0-9]{64}$/.test(image.sha256) || image.file!==`images/${image.sha256}.webp`) throw Error('Invalid bundle image path');
    const bytes=await fs.readFile(path.join(directory,image.file));
    if(sha(bytes)!==image.sha256 || bytes.length!==image.bytes || bytes.length>5242880
      || bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WEBP') throw Error('Bundle image integrity failure');
  }
  return bundle;
}

async function exportBundle(options) {
  const api=await client(options['env-file'],'local');
  const catalog=JSON.parse(await fs.readFile(options.catalog ?? 'data/equipments/247-fitness-hk-official-catalog.json','utf8'));
  const data=await snapshot(api),directory=path.resolve(options.bundle);
  await fs.mkdir(directory); // Fail rather than overwrite a previous release artifact.
  await fs.mkdir(path.join(directory,'images'));
  const records=[];
  for(const entry of catalog.equipment) {
    const matches=data.equipment.filter(e=>e.source_external_id===`247-fitness:${entry.inventory_id}`);
    if(matches.length!==1 || trim(matches[0].model_number)!==trim(entry.source_model)) throw Error('Local identity mismatch '+entry.inventory_id);
    const machine=matches[0],brand=data.brands.find(b=>b.id===machine.brand_id);
    if(!brand) throw Error('Missing local brand');
    const sourceImage=data.images.find(i=>i.equipment_id===machine.id && i.image_role==='official' && i.url===entry.official_image_url && i.storage_path);
    let image=null;
    if(sourceImage) {
      const bytes=await api.request(`/storage/v1/object/${BUCKET}/${objectUrl(sourceImage.storage_path)}`,{raw:true});
      const hash=sha(bytes),file=`images/${hash}.webp`;
      await fs.writeFile(path.join(directory,file),bytes);
      image={url:sourceImage.url,source_url:sourceImage.source_url,sha256:hash,file,bytes:bytes.length};
    }
    records.push({machine:pick(machine),brand_slug:brand.slug,image,pending_image_url:image?null:entry.official_image_url});
  }
  await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify({version:1,exported_at:new Date().toISOString(),records},null,2)+'\n');
  await readBundle(directory);
  console.log(JSON.stringify({bundle:directory,equipment:records.length,images:records.filter(r=>r.image).length,pending:records.filter(r=>!r.image).length}));
}

async function promote(options) {
  const directory=path.resolve(options.bundle),bundle=await readBundle(directory);
  const api=await client(options['env-file'],options.target),before=await snapshot(api);
  const schema=await api.request('/rest/v1/');
  if(!schema.paths?.['/rpc/promote_equipment_research'])throw Error('Apply migrations through 0066 before promotion');
  const plan=buildPromotionPlan(bundle,before.equipment,before.images,before.brands);
  const output=path.resolve(options['report-dir']);await fs.mkdir(output); // Unique report/backup per attempt.
  const report={target:options.target,url:api.base,mode:options.apply?'apply':'dry-run',started_at:new Date().toISOString(),
    pending_images:bundle.records.filter(r=>!r.image).map(r=>({external:r.machine.source_external_id,url:r.pending_image_url})),
    results:plan.map(p=>({external:p.external,status:p.status,reason:p.reason,
      ...(p.status==='ready'?{target_id:p.target.id,
        changes:Object.fromEntries(FIELDS.filter(k=>k!=='model_number' && p.target[k]!==p.record.machine[k])
          .map(k=>[k,{before:p.target[k],after:p.record.machine[k]}])),
        display_names:{before:{name:p.target.name,name_zh:p.target.name_zh},
          after:{name:trim(p.record.machine.official_name)||trim(p.record.machine.captured_name)||p.target.name,
            name_zh:trim(p.record.machine.official_name_zh)||trim(p.record.machine.captured_name_zh)||p.target.name_zh}},
        image:p.record.image?{id:p.imageId,url:p.record.image.url,before_path:p.image?.storage_path??null,
          after_path:p.storagePath,preserve_primary:p.image?.is_primary??false}:null}:{}),
    }))};
  const save=()=>fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  await save();
  if(!options.apply){console.log(JSON.stringify({report:output,...counts(report)}));if(plan.some(p=>p.status==='conflict'))process.exitCode=1;return;}
  // Durable target backup precedes every target write, including Storage uploads.
  await fs.writeFile(path.join(output,'before.json'),JSON.stringify(before,null,2)+'\n',{flag:'wx'});
  for(const [index,item] of plan.entries()) {
    if(item.status!=='ready')continue;
    const result=report.results[index];
    try {
      let image=null;
      if(item.record.image){
        const source=item.record.image,bytes=await fs.readFile(path.join(directory,source.file));
        // Content-addressed paths are safe to retry; never replace an existing object.
        let existing;
        try{existing=await api.request(`/storage/v1/object/${BUCKET}/${objectUrl(item.storagePath)}`,{raw:true});}
        catch(error){if(!error.message.endsWith('HTTP 404') && !error.message.endsWith('HTTP 400'))throw error;}
        if(existing){if(sha(existing)!==source.sha256)throw Error('Target object hash conflict');}
        else await api.request(`/storage/v1/object/${BUCKET}/${objectUrl(item.storagePath)}`,{method:'POST',body:bytes,raw:true,extra:{'Content-Type':'image/webp','x-upsert':'false'}});
        image={id:item.imageId,url:source.url,source_url:source.source_url,storage_path:item.storagePath,expected_updated_at:item.image?.updated_at ?? null};
        result.uploaded_path=item.storagePath;
      }
      const unchanged=FIELDS.filter(k=>k!=='model_number').every(k=>item.target[k]===item.record.machine[k])
        && (!image || item.image?.storage_path===item.storagePath);
      if(!unchanged)await api.request('/rest/v1/rpc/promote_equipment_research',{method:'POST',body:{p_id:item.target.id,p_expected_updated_at:item.target.updated_at,p_machine:item.record.machine,p_image:image}});
      // Verify fresh DB state and actual Storage bytes; a successful RPC alone is insufficient.
      const [current]=await api.request(`/rest/v1/equipment?id=eq.${item.target.id}&select=*`);
      if(!current || FIELDS.filter(k=>!['model_number'].includes(k)).some(k=>current[k]!==item.record.machine[k])
        || current.name!==(trim(current.official_name)||trim(current.captured_name)||current.name)
        || current.name_zh!==(trim(current.official_name_zh)||trim(current.captured_name_zh)||current.name_zh)) throw Error('Equipment verification failed');
      if(image){
        const [saved]=await api.request(`/rest/v1/equipment_images?id=eq.${item.imageId}&select=*`);
        if(!saved || saved.storage_path!==item.storagePath || saved.url!==image.url || (item.image && saved.is_primary!==item.image.is_primary)) throw Error('Image verification failed');
        const bytes=await api.request(`/storage/v1/object/public/${BUCKET}/${objectUrl(item.storagePath)}`,{raw:true});
        if(sha(bytes)!==item.record.image.sha256)throw Error('Public Storage verification failed');
      }
      result.status=unchanged?'unchanged':'verified';
    } catch(error){result.status='failed';result.reason=error.message;}
    await save();
  }
  report.completed_at=new Date().toISOString();await save();console.log(JSON.stringify({report:output,...counts(report)}));
  if(report.results.some(r=>['failed','conflict'].includes(r.status)))process.exitCode=1;
}
function counts(report){return report.results.reduce((counts,row)=>({...counts,[row.status]:(counts[row.status]??0)+1}),{});}

export function parseArgs(args) {
  const [command,...rest]=args,options={};
  if(!['export','promote'].includes(command))throw Error('Usage: export|promote --env-file FILE --bundle DIR [--target local|dev|prod --report-dir DIR --apply]');
  for(let index=0;index<rest.length;index++){
    const key=rest[index].replace(/^--/,'');
    if(rest[index]!==`--${key}` || !['env-file','bundle','target','report-dir','catalog','apply'].includes(key) || key in options)throw Error('Unknown/duplicate argument');
    if(key==='apply')options[key]=true;
    else {const value=rest[++index];if(!value || value.startsWith('--'))throw Error('Missing argument value');options[key]=value;}
  }
  if(!options['env-file'] || !options.bundle || (command==='promote' && (!HOSTS[options.target] || !options['report-dir']))
    || (command==='export' && (options.apply || options.target || options['report-dir'])))throw Error('Missing or incompatible arguments');
  return {command,options};
}
if(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{const {command,options}=parseArgs(process.argv.slice(2));await (command==='export'?exportBundle(options):promote(options));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
