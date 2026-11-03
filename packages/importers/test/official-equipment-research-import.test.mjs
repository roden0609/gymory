import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { buildOfficialResearchPlan, importOfficialResearch } from '../../../scripts/equipments/import-official-equipment-research.mjs';

describe('official equipment research import', () => {
  const entry={inventory_id:130,source_model:'SS-GLD（LP）Full',source_image_url:'https://247.example/captured.jpg',status:'candidate_requires_review',
    candidates:[{name:'Glute Bridge',product_url:'https://manufacturer.example/glute',image_url:'https://manufacturer.example/glute.jpg'}],reason:'GLB/GLD relation unconfirmed'};
  it('keeps captured and official candidate URLs in separate roles without approving the candidate',()=>{
    const [row]=buildOfficialResearchPlan({equipment:[entry]});
    expect(row.p_external_id).toBe('247-fitness:130');
    expect(row.p_research).toMatchObject({status:'candidate_requires_review',name:'Glute Bridge',note:entry.reason});
    expect(row.p_images).toEqual([{role:'captured',url:entry.source_image_url,source_url:null},
      {role:'official',url:entry.candidates[0].image_url,source_url:entry.candidates[0].product_url}]);
    expect(row.p_images.every(image=>!('is_primary' in image))).toBe(true);
  });
  it('covers all real inventory IDs with original captured images and preserves research status',()=>{
    const catalog=JSON.parse(readFileSync(new URL('../../../data/equipments/247-fitness-hk-official-catalog.json',import.meta.url),'utf8'));
    const plan=buildOfficialResearchPlan(catalog);
    expect(plan).toHaveLength(833);
    for(const [index,row] of plan.entries()) {
      expect(row.p_images.find(image=>image.role==='captured').url).toBe(catalog.equipment[index].source_image_url);
      expect(row.p_source_model).toBe(catalog.equipment[index].source_model);
    }
  });
  it('rejects duplicated IDs, unknown outcomes and non-HTTP URLs',()=>{
    for(const equipment of [[entry,entry],[{...entry,status:'admin_verified'}],[{...entry,source_image_url:'javascript:alert(1)'}]])
      expect(()=>buildOfficialResearchPlan({equipment})).toThrow();
  });
  it('keeps indexed-only names as candidates when mapping legacy research statuses',()=>{
    const [indexed,unavailable]=buildOfficialResearchPlan({equipment:[{...entry,status:'name_indexed_image_missing'},
      {...entry,inventory_id:155,status:'model_verified_image_unavailable'}]});
    expect(indexed.p_research.status).toBe('candidate_requires_review');
    expect(unavailable.p_research.status).toBe('model_verified_image_missing');
  });
  it('reports skipped admin-approved records and stops on a failed record',async()=>{
    const request=vi.fn().mockResolvedValueOnce('skipped_verified').mockResolvedValueOnce('imported');
    expect(await importOfficialResearch([{},{}],request)).toEqual({imported:1,skipped_verified:1});
    const failed=vi.fn().mockRejectedValue(new Error('stale model'));
    await expect(importOfficialResearch([{},{}],failed)).rejects.toThrow('stale model');
    expect(failed).toHaveBeenCalledTimes(1);
  });
});
