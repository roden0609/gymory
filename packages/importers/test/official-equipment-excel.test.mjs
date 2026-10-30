import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMarkdownTables } from '../../../scripts/equipments/export-equipment-research-excel.mjs';

describe('official equipment Excel report tables', () => {
  it('keeps every inventory ID and both image references from the real report', () => {
    const markdown = readFileSync(new URL('../../../docs/data/247-fitness-hk-official-equipment-research-2026-10-28.md', import.meta.url), 'utf8');
    const catalog = JSON.parse(readFileSync(new URL('../../../data/equipments/247-fitness-hk-official-catalog.json', import.meta.url), 'utf8'));
    const tables = parseMarkdownTables(markdown);
    expect(tables.map((table) => table.heading)).toEqual(['Totals', 'Coverage by brand', 'All-brand follow-up', 'Life Fitness item review', 'Full inventory cross-reference']);
    const inventory = tables.find((table) => table.heading === 'Full inventory cross-reference');
    expect(inventory.rows).toHaveLength(catalog.equipment.length);
    expect(inventory.rows.map((row) => row[0].value)).toEqual(catalog.equipment.map((_, index) => index + 1));
    for (const [index, equipment] of catalog.equipment.entries()) {
      const row = inventory.rows[index];
      expect(row).toHaveLength(inventory.headers.length);
      expect(row[1].value).toBe(String(equipment.inventory_id));
      expect(row[8].url ?? null).toBe(equipment.official_image_url);
      expect(row[9].url).toBe(equipment.source_image_url);
    }
    expect(tables[0].rows.reduce((sum, row) => sum + row[1].value, 0)).toBe(catalog.equipment.length);
    expect(tables[1].rows.reduce((sum, row) => sum + row[1].value, 0)).toBe(catalog.equipment.length);
    const reviews = tables.find((table) => table.heading === 'All-brand follow-up');
    expect(reviews.rows).toHaveLength(35);
    expect(reviews.rows.reduce((sum, row) => sum + row[1].value, 0)).toBe(657);
    expect(reviews.rows.map((row) => row[0].value)).toEqual(catalog.brand_reviews.map((review) => review.brand));
    const lifeFitness = tables.find((table) => table.heading === 'Life Fitness item review');
    const equipment = catalog.equipment.filter((entry) => entry.brand === 'Life Fitness');
    expect(lifeFitness.rows).toHaveLength(112);
    expect(lifeFitness.rows.map((row) => row[0].value)).toEqual(equipment.map((entry) => String(entry.inventory_id)));
    for (const [index, entry] of equipment.entries()) {
      expect(lifeFitness.rows[index][6].value).toBe(entry.status);
      expect(lifeFitness.rows[index][9].url).toBe(entry.source_image_url);
    }
  });

  it('preserves escaped pipes, leading-zero IDs and parentheses in links', () => {
    const [table] = parseMarkdownTables([
      '## Inventory',
      '| # | Inventory ID | Source name | 24/7 image |',
      '| ---: | ---: | --- | --- |',
      '| 1 | 00123 | Press \\| Row | [image](https://example.com/image_(1).png?width=200&height=100) |',
      '| 2 | 00124 | Next record | — |',
    ].join('\n'));
    expect(table.rows).toEqual([
      [{ value: 1 }, { value: '00123' }, { value: 'Press | Row' }, { value: 'image', url: 'https://example.com/image_(1).png?width=200&height=100' }],
      [{ value: 2 }, { value: '00124' }, { value: 'Next record' }, { value: '—' }],
    ]);
  });

  it('rejects malformed rows instead of silently dropping columns', () => {
    expect(() => parseMarkdownTables('## Test\n| Name | Count |\n| --- | ---: |\n| Broken | 1 | extra |')).toThrow('Invalid column count');
  });

  it('does not turn table examples inside fenced code into worksheets', () => {
    expect(parseMarkdownTables('```\n| Name |\n| --- |\n| Example |\n```')).toEqual([]);
  });
});
