import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { buildPlan, equipmentClassification, equipmentType, persistPlan, reviewedEquipmentTypes } from '../../../scripts/equipments/import-247-equipment.mjs';

const baseline = [{ slug: '24-7-fitness-aberdeen-338' }];
const sourceItem = { inventory_id: 244, brand: 'NEWTECH', name: '14-Pair Dumbbell Rack', model: 'NT-F-DBR', category_names: ['MultiFunction'] };
const planFor = (item = sourceItem) => buildPlan(baseline, [{ store_id: 338, country_code: 'HK', status: 'source_api_complete', row_count: 1, equipment: [item] }]);

function database() {
  return {
    gyms: [{ id: 'gym', slug: baseline[0].slug }],
    equipment_brands: [{ id: 'brand', slug: 'newtech', name_en: 'NEWTECH' }],
    equipment_categories: [{ id: 'free-weight', slug: 'free-weight' }],
    equipment_types: [],
    equipment: [{ id: 'model', brand_id: 'brand', source_external_id: '247-fitness:244', equipment_type_code: 'other_equipment', name: sourceItem.name, model_number: sourceItem.model }],
    gym_equipment_inventory: [{ gym_id: 'gym', equipment_id: 'model', quantity: 4, source: 'admin', notes: 'Keep manual inventory' }],
  };
}

function adapter(data) {
  const writes = [];
  const request = async (resource, payload, options) => {
    const table = resource.split('?')[0];
    if (!payload) return data[table];
    writes.push({ resource, payload, options });
    if (options?.method === 'PATCH') {
      Object.assign(data.equipment[0], payload);
      return [data.equipment[0]];
    }
    data[table].push(...payload);
    return payload;
  };
  return { request, writes };
}

describe('reviewed 24/7 equipment classification', () => {
  it.each([
    ['Panatta', '1FW082', 'Alternate Leg Curling', 'lying_leg_curl_machine'],
    ['Technogym', 'MNOC', 'SELECTION700', 'hip_abductor_machine'],
    ['Life Fitness', 'MJLPD', 'Truncated display name...', 'lat_pulldown_cable'],
    ['Hammer Strength', 'SUB', '练习椅', 'bench'],
    ['Panatta', '1FW122', 'POWER SMITH DUAL SYSTEM UPPER', 'multi_press_machine'],
    ['NEWTECH', 'NT-T-SCR', 'Torture Squat & Caf Raise(new)', 'squat_machine'],
    ['NEWTECH', 'NT-OH-VR', 'R Low Cable', 'cable_machine'],
    ['Nautilus', '9NP-L8507', 'Nautilus Freedom Rack', 'smith_machine'],
    ['Life Fitness', 'LPP-CORE', 'LF PWR PLAY CORE', 'modular_station_frame'],
    ['GLUTE BUILDER', 'GPL0551', 'Multi-Function Deadlift Trainer', 'deadlift_machine'],
    ['KAYAKPRO', 'D1X', 'Multistroke Ergometer 龍舟', 'paddle_ergometer'],
    ['SKELCORE', 'SK-PL-CC1', 'Skelcore Classic Reformer - Oak', 'pilates_reformer'],
  ])('uses reviewed brand/model identity: %s %s', (brand, model, name, expected) => {
    expect(equipmentType({ brand, model, name })).toBe(expected);
  });

  it('classifies every audited source record using the actual captured input', () => {
    const audit = JSON.parse(readFileSync(new URL('../../../docs/data/other-equipment-full-review-2026-10-27.json', import.meta.url)));
    const dir = new URL('../../../data/equipments/247-fitness-hk/', import.meta.url);
    const inputs = new Map();
    for (const filename of readdirSync(dir).filter(f => f.endsWith('.json'))) {
      for (const row of JSON.parse(readFileSync(new URL(filename, dir))).equipment) inputs.set(row.inventory_id, row);
    }
    expect(audit.equipment).toHaveLength(180);
    for (const row of audit.equipment) {
      const input = inputs.get(row.source_inventory_id);
      expect(input, row.source_external_id).toBeDefined();
      expect(equipmentType(input), row.source_external_id).toBe(row.recommended_equipment_type_code);
    }
  });

  it('does not borrow another brand’s model or infer from empty model placeholders', () => {
    expect(equipmentType({ model: 'SUB', name: 'Unknown device' })).toBe('other_equipment');
    expect(equipmentType({ brand: 'Unknown', model: 'SUB', name: 'Unknown device' })).toBe('other_equipment');
    expect(equipmentType({ brand: 'Life Fitness', model: '-', name: 'Unknown device' })).toBe('other_equipment');
    expect(equipmentType({ brand: 'Life Fitness', model: '', name: 'Unknown device' })).toBe('other_equipment');
  });

  it.each(['brand', 'name', 'model'])('flags a reused source ID with changed %s instead of applying its old mapping', field => {
    const item = { ...sourceItem, [field]: 'Changed identity' };
    expect(equipmentType(item)).toBe('other_equipment');
    expect(equipmentClassification(item).needs_review).toBe(true);
    expect(planFor(item).review[0].notes).toContain('identity changed');
  });

  it('keeps multi-function and conditional classifications in the plan without inventing DB columns', () => {
    const item = { brand: 'Life Fitness', model: 'MJSCOR22510592', name: 'Life Fitness Signature Series MJ Core', inventory_id: 1500, category_names: [] };
    const plan = planFor(item);
    expect(plan.equipment[0].equipment_type_code).toBe('cable_machine');
    expect(plan.review[0].notes).toContain('框架');
    const dual = equipmentClassification({ brand: 'Technogym', model: 'MNOC', name: 'SELECTION700' });
    expect(dual.secondary_equipment_type_codes).toEqual(['hip_adductor_machine']);
  });

  it('creates needed reviewed types, reclassifies both foreign keys, and is idempotent', async () => {
    const data = database();
    const { request, writes } = adapter(data);
    const plan = planFor();
    const originalInventory = structuredClone(data.gym_equipment_inventory);
    expect(await persistPlan(plan, request)).toMatchObject({ typesCreated: 1, reclassified: 1, inserted: 0 });
    expect(writes[0]).toEqual({ resource: 'equipment_types?on_conflict=code', payload: [reviewedEquipmentTypes.find(t => t.code === 'dumbbell_storage_rack')], options: undefined });
    expect(writes[1].payload).toEqual({ equipment_type_code: 'dumbbell_storage_rack', category_id: 'free-weight' });
    expect(writes[1].resource).toContain('equipment_type_code=eq.other_equipment');
    expect(data.gym_equipment_inventory).toEqual(originalInventory);
    expect(await persistPlan(plan, request)).toMatchObject({ typesCreated: 0, reclassified: 0, inserted: 0 });
    expect(writes).toHaveLength(2);
  });

  it.each(['missing_category', 'inactive_type', 'conflicting_category', 'unknown_type', 'missing_gym'])(
    'validates the complete plan before type or model writes: %s', async scenario => {
      const data = database();
      const plan = planFor();
      if (scenario === 'missing_category') data.equipment_categories = [];
      if (scenario === 'inactive_type') data.equipment_types = [{ code: 'dumbbell_storage_rack', category: 'free_weight', is_active: false }];
      if (scenario === 'conflicting_category') {
        data.equipment_types = [{ code: 'dumbbell_storage_rack', category: 'cardio', is_active: true }];
        data.equipment_categories.push({ id: 'cardio', slug: 'cardio' });
      }
      if (scenario === 'unknown_type') plan.equipment.push({ ...plan.equipment[0], key: 'unknown', equipment_type_code: 'unreviewed_new_type' });
      if (scenario === 'missing_gym') data.gyms = [];
      const { request, writes } = adapter(data);
      await expect(persistPlan(plan, request)).rejects.toThrow();
      expect(writes).toEqual([]);
    },
  );

  it('leaves existing reviewed type metadata intact', async () => {
    const data = database();
    const type = { code: 'dumbbell_storage_rack', category: 'free_weight', is_active: true, name_en: 'Custom name' };
    data.equipment_types.push(type);
    const { request, writes } = adapter(data);
    expect((await persistPlan(planFor(), request)).typesCreated).toBe(0);
    expect(writes).toHaveLength(1);
    expect(type.name_en).toBe('Custom name');
  });

  it('stops before model changes when type creation conflicts', async () => {
    const data = database();
    const writes = [];
    const request = async (resource, payload) => {
      if (!payload) return data[resource.split('?')[0]];
      writes.push(resource);
      return [];
    };
    await expect(persistPlan(planFor(), request)).rejects.toThrow('Concurrent equipment type conflict');
    expect(writes).toEqual(['equipment_types?on_conflict=code']);
  });
});
