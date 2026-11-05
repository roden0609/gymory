import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMarkdownTables, workbookTables } from '../../../scripts/equipments/export-equipment-research-excel.mjs';

describe('official equipment Excel report tables', () => {
  it('keeps every inventory ID and both image references from the real report', () => {
    const markdown = readFileSync(new URL('../../../docs/data/247-fitness-hk-official-equipment-research-2026-10-28.md', import.meta.url), 'utf8');
    const catalog = JSON.parse(readFileSync(new URL('../../../data/equipments/247-fitness-hk-official-catalog.json', import.meta.url), 'utf8'));
    const tables = parseMarkdownTables(markdown);
    expect(tables.map((table) => table.heading)).toEqual(['Totals', 'Coverage by brand', 'Name coverage by brand', 'All-brand follow-up', 'Full inventory cross-reference']);
    const coverage = tables.find((table) => table.heading === 'Name coverage by brand');
    expect(coverage.rows).toHaveLength(new Set(catalog.equipment.map((e) => e.brand)).size);
    for (const row of coverage.rows) {
      const group = catalog.equipment.filter((e) => e.brand === row[0].value);
      const english = group.filter((e) => e.official_name?.trim()).length;
      const chinese = group.filter((e) => e.official_name_zh?.trim()).length;
      expect(row.slice(1, 6).map((c) => c.value)).toEqual([group.length, english, group.length - english, chinese, group.length - chinese]);
    }
    const inventory = tables.find((table) => table.heading === 'Full inventory cross-reference');
    expect(inventory.rows).toHaveLength(catalog.equipment.length);
    expect(inventory.rows.map((row) => row[0].value)).toEqual(catalog.equipment.map((_, index) => index + 1));
    for (const [index, equipment] of catalog.equipment.entries()) {
      const row = inventory.rows[index];
      expect(row).toHaveLength(inventory.headers.length);
      expect(row[1].value).toBe(String(equipment.inventory_id));
      expect(row[inventory.headers.indexOf('Official Chinese name')].value).toBe(equipment.official_name_zh || '—');
      expect(row[inventory.headers.indexOf('Official image')].url ?? null).toBe(equipment.official_image_url);
      expect(row[inventory.headers.indexOf('24/7 image')].url).toBe(equipment.source_image_url);
      const chineseEvidence = equipment.official_name_zh_evidence || {};
      for (const [heading, value] of [
        ['Match scope', equipment.match_scope],
        ['Review note', equipment.configuration_note],
        ['Original manufacturer wording', chineseEvidence.original_name],
        ['Source locale', chineseEvidence.source_locale],
        ['Conversion', chineseEvidence.conversion_method],
        ['Chinese name scope', chineseEvidence.match_scope],
      ]) {
        expect(inventory.headers).toContain(heading);
        expect(row[inventory.headers.indexOf(heading)].value).toBe(value || '—');
      }
    }
    expect(tables[0].rows.reduce((sum, row) => sum + row[1].value, 0)).toBe(catalog.equipment.length);
    expect(tables[1].rows.reduce((sum, row) => sum + row[1].value, 0)).toBe(catalog.equipment.length);
    const named = catalog.equipment.filter((entry) => entry.official_name_zh);
    expect(tables[1].rows.reduce((sum, row) => sum + row[7].value, 0)).toBe(named.length);
    const reviews = tables.find((table) => table.heading === 'All-brand follow-up');
    expect(reviews.rows).toHaveLength(35);
    expect(reviews.rows.reduce((sum, row) => sum + row[1].value, 0)).toBe(657);
    expect(reviews.rows.map((row) => row[0].value)).toEqual(catalog.brand_reviews.map((review) => review.brand));

  });

  it('merges coverage summaries by brand without duplicating shared counts', () => {
    const markdown = readFileSync(new URL('../../../docs/data/247-fitness-hk-official-equipment-research-2026-10-28.md', import.meta.url), 'utf8');
    const tables = parseMarkdownTables(markdown);
    const names = tables.find((t) => t.heading === 'Name coverage by brand');
    names.rows.reverse(); // Joining must use brand, not row order.
    const merged = workbookTables(tables);
    expect(merged.map((t) => t.heading)).toEqual(['Totals', 'Coverage by brand', 'All-brand follow-up', 'Full inventory cross-reference']);
    const coverage = merged[1];
    expect(coverage.headers).toHaveLength(12);
    for (const row of coverage.rows) {
      const original = names.rows.find((r) => r[0].value === row[0].value);
      expect(row.slice(8)).toEqual([original[2], original[3], original[5], original[6]]);
    }
    expect(merged.at(-1)).toBe(tables.at(-1));
    names.rows[0][1] = { value: -1 };
    expect(() => workbookTables(tables)).toThrow('Coverage summaries disagree');
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
