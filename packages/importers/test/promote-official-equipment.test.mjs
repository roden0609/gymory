import { describe, expect, it } from 'vitest';
import { buildPromotionPlan, parseArgs, readBundle, validateTarget } from '../../../scripts/equipments/promote-official-equipment.mjs';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

const source={source_external_id:'247-fitness:1',model_number:' M1 ',captured_name:'Captured',captured_name_zh:'擷取',official_name:'Official',official_name_zh:null};
const record={machine:source,brand_slug:'brand',image:{url:'https://example.com/a.jpg',sha256:'a'.repeat(64)}};
const target={...source,id:'target-uuid',brand_id:'target-brand',model_number:'M1',name:'Old display'};
const brands=[{id:'target-brand',slug:'brand'}];
const bundle={version:1,records:[record]};
const plan=(equipment=[target],images=[])=>buildPromotionPlan(bundle,equipment,images,brands)[0];
describe('equipment promotion planning',()=>{
  it('remaps IDs, reuses matching target image and preserves primary selection',()=>{
    const image={equipment_id:target.id,id:'target-image',image_role:'official',url:record.image.url,is_primary:true};
    expect(plan([target],[image])).toMatchObject({status:'ready',imageId:'target-image',storagePath:`target-uuid/target-image/${'a'.repeat(64)}.webp`,image:{is_primary:true}});
  });
  it('uses deterministic target-local IDs for retrying an interrupted upload',()=>{
    const first=plan(),second=plan();
    expect(first.imageId).toBe(second.imageId);
    expect(first.storagePath).toBe(second.storagePath);
    expect(first.imageId).not.toBe(buildPromotionPlan(bundle,[{...target,id:'different'}],[],brands)[0].imageId);
  });
  it('skips approved target equipment and reports identity/provenance conflicts',()=>{
    expect(plan([{...target,official_verified_at:'2026-11-10'}]).status).toBe('skipped_verified');
    for(const rows of [[],[target,target],[{...target,model_number:'Other'}],[{...target,brand_id:'other'}],[{...target,captured_name:'Different'}]])
      expect(plan(rows).status).toBe('conflict');
  });
  it('allows missing target provenance and unavailable images without guessing replacements',()=>{
    expect(plan([{...target,captured_name:null}]).status).toBe('ready');
    const [row]=buildPromotionPlan({version:1,records:[{...record,image:null,pending_image_url:'https://example.com/missing.jpg'}]},[target],[],brands);
    expect(row.storagePath).toBeNull();
  });
  it('rejects duplicate and invalid bundle identities',()=>{
    expect(()=>buildPromotionPlan({...bundle,records:[record,record]},[target],[],brands)).toThrow('duplicate');
    expect(()=>buildPromotionPlan({...bundle,version:2},[],[],[])).toThrow('Invalid bundle');
  });
  it('fails closed on wrong environment URLs and ambient target assumptions',()=>{
    expect(validateTarget('http://127.0.0.1:54321','local')).toBe('http://127.0.0.1:54321');
    expect(validateTarget('https://yzvipswjmgcolaepqwoz.supabase.co','dev')).toContain('yzvips');
    for(const url of ['https://qgldameylaysgfsvytjh.supabase.co','http://yzvipswjmgcolaepqwoz.supabase.co','https://user:pass@yzvipswjmgcolaepqwoz.supabase.co','https://yzvipswjmgcolaepqwoz.supabase.co/other'])
      expect(()=>validateTarget(url,'dev')).toThrow();
  });
  it('defaults to dry-run and requires explicit target/env/report directory',()=>{
    const args=['promote','--target','dev','--env-file','apps/web/.env.dev','--bundle','bundle','--report-dir','report'];
    expect(parseArgs(args).options.apply).toBeUndefined();
    expect(parseArgs([...args,'--apply']).options.apply).toBe(true);
    for(const args of [['promote'],['promote','--apply','--unknown'],['export','--env-file','file','--bundle','bundle','--apply']])
      expect(()=>parseArgs(args)).toThrow();
  });
  it('checks image content hashes and disallows manifest path traversal',async()=>{
    const dir=await mkdtemp(path.join(tmpdir(),'gymory-promotion-test-'));
    try{
      const bytes=Buffer.from('RIFF1234WEBPtest'),hash=createHash('sha256').update(bytes).digest('hex');
      await mkdir(path.join(dir,'images'));
      await writeFile(path.join(dir,`images/${hash}.webp`),bytes);
      const manifest={version:1,records:[{...record,image:{...record.image,file:`images/${hash}.webp`,sha256:hash,bytes:bytes.length}}]};
      await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest));
      await expect(readBundle(dir)).resolves.toMatchObject({version:1});
      await writeFile(path.join(dir,`images/${hash}.webp`),'tampered');
      await expect(readBundle(dir)).rejects.toThrow('integrity');
      manifest.records[0].image.file='../secret';
      await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest));
      await expect(readBundle(dir)).rejects.toThrow('path');
    } finally{await rm(dir,{recursive:true,force:true});}
  });
});
