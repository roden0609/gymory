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
  it.each([
    ['Country Ski Trainer', 'ski_erg'],
    ['DB/Row Kickback Bench', 'bench'],
    ['Dual Pulley', 'cable_machine'],
    ['Endurance Climbmill with LED Console', 'climber'],
    ['Endurance ClimbMill with LED Premium Console', 'climber'],
    ['EXCITE+ CLIMB', 'climber'],
    ['Incline Fly', 'chest_fly_machine'],
    ['Integrity SE3 HD樓梯機', 'climber'],
    ['Iso-Lateral Wide Chest', 'iso_lateral_chest_press_machine'],
    ['LF PWR PLAY ADJUSTABLE 2:1 CABLE', 'cable_machine'],
    ['Life Fitness Axiom Series Leg Press (w/Full Shroud)', 'leg_press_machine'],
    ['Life Fitness Powermill with SL Console', 'climber'],
    ['Life Fitness Signature Series MJ Station-Adjustable Cable...', 'cable_machine'],
    ['Life Fitness Signature Series MJ Station-Dual Pulley...', 'other_equipment'],
    ['Linear T-barrow', 't_bar_row_machine'],
    ['MULTI HIP', 'multi_hip_machine'],
    ['Nautilus Adjustable Abdominal / Decline Bench', 'ab_crunch_bench'],
    ['Nautilus Cross-Over Cables with Adj Pulleys', 'cable_machine'],
    ['Nautilus Impact Deltoid Fly', 'reverse_fly_machine'],
    ['Nautilus Impact Seated Leg Curl W/O ROM', 'seated_leg_curl_machine'],
    ['OLYMPIC PLATFORM FOR HALF RACK | 3X3 m', 'platform'],
    ['Pectoral Fly/Rear Deltoid (w/Full Shroud)', 'other_equipment'],
    ['Leg Extension / Seated Leg Curl W/O ROM', 'other_equipment'],
    ['Dual Pulley / Leg Press', 'other_equipment'],
    ['Glute Kickback', 'glute_extension_machine'],
    ['Dumbbell Rack | 3X3 m', 'other_equipment'],
    ['Dual Adjustable Pulley Performance', 'cable_machine'],
    ['Dual Cable Crossover LITE', 'cable_machine'],
    ['CMS Dual Adjustable Pulley', 'cable_machine'],
    ['BIKE ROSSOPURO | TOUCH', 'exercise_bike'],
    ['ELLIPTICAL | FENIX TOUCH', 'elliptical_machine'],
    ['SUPER LEG PRESS 45° DUAL SYSTEM', 'leg_press_machine'],
    ['SUPER HORIZONTAL MULTI PRESS', 'multi_press_machine'],
    ['IPF Competition Combo Rack', 'rack'],
    ['24/7 FITNESS Half Rack', 'rack'],
    ['Star Trac Rear-Drive Elliptical', 'elliptical_machine'],
    ['StarTrac 6CT Cross Trainer LCD', 'elliptical_machine'],
    ['Star Trac 8TR Commercial Treadmill w/ 22" LED', 'treadmill'],
    ['8 Series Freeclimber w/LCD Console', 'climber'],
    ['AssaultRunner Pro', 'assault_runner'],
    ['Reverse Hyper', 'reverse_hyper'],
    ['Selection 900 Rotary Torso', 'torso_rotation_machine'],
    ['Fixed Pad Glute/Ham Bench', 'glute_ham_developer'],
    ['Flexibility Trainer', 'stretching_machine'],
    ['POWER SMITH DUAL SYSTEM UPPER', 'other_equipment'],
    ['POWER SMITH MACHINE DUAL SYSTEM', 'smith_machine'],
    ['Glute Ham Developer', 'glute_ham_developer'],
    ['OnHim Glute Kick-Back', 'glute_extension_machine'],
    ['Glute Bridge', 'hip_thrust_machine'],
    ['Seated Dip', 'dip_machine'],
    ['DIPS PRESS DUAL SYSTEM', 'dip_machine'],
    ['Seated Lateal Raise', 'lateral_raise_machine'],
    ['Nautilus Impact Deltoid Raise', 'lateral_raise_machine'],
    ['Pure Biceps', 'bicep_curl_machine'],
    ['ARM EXTENSION', 'tricep_extension_machine'],
    ['Torture Overhead Extension', 'tricep_extension_machine'],
    ['TOTAL CORE CRUNCH MACHINE', 'ab_crunch_machine'],
    ['Plate Loaded Pendulum-X Squat', 'squat_machine'],
    ['V-Squat', 'squat_machine'],
    ['LF PWR PLAY DUAL CABLE PULLDOWN', 'lat_pulldown_cable'],
    ['LF PWR PLAY DUAL CABLE ROW', 'seated_row_cable'],
    ['Life Fitness Signature Series MJ Station-Dual Pulley Row', 'seated_row_cable'],
    ['Dumbbell Rack', 'other_equipment'],
    ['Olympic Bench Weight Storage', 'other_equipment'],
    ['Hip Add/Abd Combo', 'other_equipment'],
    ['ADDUCTOR/ ABDUCTOR MACHINE', 'other_equipment'],
    ['Leg Extension / Leg Curl', 'other_equipment'],
    ['Axiom Series Dual Seated Leg Extension/Curl', 'other_equipment'],
    ['Standing Leg Curl', 'other_equipment'],
    ['KNEELING LEG CURLING', 'other_equipment'],
    ['Glute Ham / Reverse Hyper Combo', 'other_equipment'],
    ['Pectoral Fly/Rear Deltoid', 'other_equipment'],
    ['Pec Dec Fly with Reverse', 'other_equipment'],
    ['Standing Fly Chest & Back', 'other_equipment'],
    ['SQUAT MACHINE AND CALF', 'other_equipment'],
    ['4-Way Neck', 'other_equipment'],
    ['SELECTION700', 'other_equipment'],
  ])('maps %s to %s without confusing display options and multiple movements', (name, expected) => {
    expect(equipmentType({ ...item, name })).toBe(expected);
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

  it.each(['imported', 'manual', 'other_importer', 'classified', 'still_other', 'concurrent_edit'])(
    'only reclassifies importer-owned Other models: %s', async (scenario) => {
      const plan = buildPlan(baseline, [store]);
      if (scenario === 'still_other') plan.equipment[0].equipment_type_code = 'other_equipment';
      const original = {
        id: 'e', brand_id: 'b', name: item.name, model_number: item.model,
        source_external_id: '247-fitness:12', equipment_type_code: 'other_equipment',
        category_id: 'old', name_zh: 'existing translation', description: 'manual notes',
      };
      if (scenario === 'manual') original.source_external_id = null;
      if (scenario === 'other_importer') original.source_external_id = 'another:12';
      if (scenario === 'classified') original.equipment_type_code = 'exercise_bike';
      const model = structuredClone(original);
      const data = {
        gyms: [{ id: 'g', slug: baseline[0].slug }],
        equipment_brands: [{ id: 'b', slug: 'sportsart', name_en: 'SportsArt' }],
        equipment_types: [
          { code: 'treadmill', category: 'cardio', is_active: true },
          { code: 'other_equipment', category: 'other', is_active: true },
        ],
        equipment_categories: [{ id: 'cardio-category', slug: 'cardio' }, { id: 'old', slug: 'other' }],
        equipment: [model],
        gym_equipment_inventory: [{ gym_id: 'g', equipment_id: 'e', quantity: 7, source: 'admin' }],
      };
      const writes = [];
      const request = async (resource, payload, options) => {
        if (!payload) return data[resource.split('?')[0]];
        writes.push({ resource, payload, options });
        expect(options).toEqual({ method: 'PATCH' });
        expect(resource).toBe('equipment?id=eq.e&source_external_id=eq.247-fitness%3A12&equipment_type_code=eq.other_equipment');
        expect(payload).toEqual({ equipment_type_code: 'treadmill', category_id: 'cardio-category' });
        if (scenario === 'concurrent_edit') {
          model.equipment_type_code = 'exercise_bike';
          return [];
        }
        Object.assign(model, payload);
        return [model];
      };
      const result = await persistPlan(plan, request);
      expect(result.reclassified).toBe(scenario === 'imported' ? 1 : 0);
      expect(result.inserted).toBe(0);
      expect(writes).toHaveLength(['imported', 'concurrent_edit'].includes(scenario) ? 1 : 0);
      expect(model).toEqual({ ...original, ...(scenario === 'imported'
        ? { equipment_type_code: 'treadmill', category_id: 'cardio-category' }
        : scenario === 'concurrent_edit' ? { equipment_type_code: 'exercise_bike' } : {}) });
      expect(data.gym_equipment_inventory[0].quantity).toBe(7);
      const previousWrites = writes.length;
      expect((await persistPlan(plan, request)).reclassified).toBe(0);
      expect(writes).toHaveLength(previousWrites);
    },
  );

});
