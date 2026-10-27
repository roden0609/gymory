import { describe, it, expect } from 'vitest';
import { buildPlan, equipmentType, persistPlan, brandSlug } from '../../../scripts/equipments/import-247-equipment.mjs';
const item = { inventory_id: 12, brand: 'SportArt', name: 'Treadmill', category_names: ['Cardio'], model: 'T1' };
const store = { store_id: 338, status: 'source_api_complete', country_code: 'HK', row_count: 1, equipment: [item] };
const baseline = [{ slug: '24-7-fitness-aberdeen-338' }];
describe('24/7 equipment import', () => {
  it('joins exact store IDs and deduplicates inventory entries without inferring quantity', () => {
    const plan = buildPlan(baseline, [{ ...store, row_count: 2, equipment: [item, item] }]);
    expect(plan.gyms[0].equipment_keys).toEqual(['247-fitness:12']);
    expect(plan.equipment).toHaveLength(1);
    expect(brandSlug('SportArt')).toBe('sportsart');
  });
  it('rejects unmatched, incomplete and conflicting input', () => {
    expect(() => buildPlan([], [store])).toThrow('Unmatched');
    expect(() => buildPlan(baseline, [{ ...store, status: 'partial' }])).toThrow('Incomplete');
    expect(() => buildPlan(baseline, [{ ...store, row_count: 2, equipment: [item, { ...item, name: 'Bike' }] }])).toThrow('Conflicting');
  });
  it('does not turn empty inventories into absence or zero counts', () => {
    expect(buildPlan(baseline, [{ ...store, status: 'empty_in_source', row_count: 0, equipment: [] }]).gyms[0].equipment_keys).toEqual([]);
  });
  it('distinguishes cardio rowing from resistance rows and flags dual-purpose models', () => {
    expect(equipmentType({ ...item, name: 'Rowing machine', category_names: ['Cardio'] })).toBe('rower');
    expect(equipmentType({ ...item, name: 'Rowing machine', category_names: ['Back'] })).toBe('seated_row_machine');
    expect(equipmentType({ ...item, name: 'Leg Extension / Leg Curl' })).toBe('other_equipment');
    expect(equipmentType({ ...item, name: 'Standing Leg Curl' })).toBe('other_equipment');
    expect(equipmentType({ ...item, name: 'Dumbbell Rack' })).toBe('other_equipment');
  });
  it('fails before writes if any target gym is missing', async () => {
    const writes = [];
    const request = async (resource, rows) => { if (rows) writes.push(resource); return []; };
    await expect(persistPlan(buildPlan(baseline, [store]), request)).rejects.toThrow('Gym missing');
    expect(writes).toEqual([]);
  });
  it('reuses existing models and preserves reported inventory on repeated imports', async () => {
    const writes = [];
    const data = {
      gyms: [{ id: 'g', slug: baseline[0].slug }],
      equipment_brands: [{ id: 'b', slug: 'sportsart', name_en: 'SportsArt' }],
      equipment_types: [{ code: 'treadmill', category: 'cardio', is_active: true }],
      equipment_categories: [{ id: 'c', slug: 'cardio' }],
      equipment: [{ id: 'e', brand_id: 'b', name: 'Existing treadmill', model_number: 'T1' }],
      gym_equipment_inventory: [],
    };
    const request = async (resource, rows) => {
      const table = resource.split('?')[0];
      if (!rows) return data[table];
      writes.push({ table, rows }); data[table].push(...rows); return rows;
    };
    const plan = buildPlan(baseline, [store]);
    expect((await persistPlan(plan, request)).inserted).toBe(1);
    expect(writes[0].rows[0]).toMatchObject({ gym_id: 'g', equipment_id: 'e', quantity: null, verified_status: 'unverified' });
    expect((await persistPlan(plan, request)).inserted).toBe(0);
    expect(writes).toHaveLength(1);
  });
  it('verifies new imports and promotes only this importer’s unverified rows without changing other data', async () => {
    const plan = buildPlan(baseline, [store]);
    const timestamp = '2026-10-27T08:00:00.000Z';
    for (const scenario of ['new', 'imported', 'admin', 'owner_verified', 'admin_verified', 'community_verified', 'other_import']) {
      const original = {
        gym_id: 'g', equipment_id: 'e', source: 'import',
        verified_status: 'unverified', notes: '24/7 app inventory; 247-fitness:12. Presence only; quantity unknown.',
        quantity: 3, condition: 'good', verified_by_user_id: 'existing-user',
      };
      if (scenario === 'admin') original.source = 'admin';
      if (scenario.endsWith('_verified')) original.verified_status = scenario;
      if (scenario === 'other_import') original.notes = 'Different importer';
      const inventory = scenario === 'new' ? [] : [structuredClone(original)];
      const data = {
        gyms: [{ id: 'g', slug: baseline[0].slug }],
        equipment_brands: [{ id: 'b', slug: 'sportsart', name_en: 'SportsArt' }],
        equipment_types: [{ code: 'treadmill', category: 'cardio', is_active: true }],
        equipment_categories: [{ id: 'c', slug: 'cardio' }],
        equipment: [{ id: 'e', brand_id: 'b', name: item.name, model_number: 'T1' }],
        gym_equipment_inventory: inventory,
      };
      const writes = [];
      const request = async (resource, payload, options) => {
        if (!payload) return data[resource.split('?')[0]];
        writes.push({ resource, payload, options });
        if (options?.method === 'PATCH') {
          Object.assign(inventory[0], payload);
          return [inventory[0]];
        }
        inventory.push(...payload);
        return payload;
      };
      const result = await persistPlan(plan, request, { verify: true, now: () => new Date(timestamp) });
      expect(result.verified).toBe(['new', 'imported'].includes(scenario) ? 1 : 0);
      if (scenario === 'new') {
        expect(inventory[0]).toMatchObject({ source: 'import', verified_status: 'admin_verified', verified_at: timestamp, quantity: null });
      } else if (scenario === 'imported') {
        expect(writes[0].options).toEqual({ method: 'PATCH' });
        expect(writes[0].resource).toContain('verified_status=eq.unverified');
        expect(writes[0].payload).toEqual({ verified_status: 'admin_verified', verified_at: timestamp });
        expect(inventory[0]).toEqual({ ...original, verified_status: 'admin_verified', verified_at: timestamp });
      } else {
        expect(writes).toHaveLength(0);
        expect(inventory[0]).toEqual(original);
      }
      const writeCount = writes.length;
      expect((await persistPlan(plan, request, { verify: true })).verified).toBe(0);
      expect(writes).toHaveLength(writeCount);
    }
  });

});
