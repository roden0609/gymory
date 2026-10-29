#!/usr/bin/env node
/** Export each Markdown report table to its own Excel worksheet. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

function splitRow(line) {
  return line.trim().slice(1, -1).split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\([\\|])/g, '$1'));
}

export function parseMarkdownTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tables = [];
  let heading = 'Table';
  let fenced = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const section = lines[i].match(/^##\s+(.+)$/);
    if (section) heading = section[1];
    if (!lines[i].trim().startsWith('|') || !lines[i + 1]?.trim().startsWith('|')) continue;
    const alignments = splitRow(lines[i + 1]);
    if (!alignments.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    const headers = splitRow(lines[i]);
    if (headers.length !== alignments.length) throw new Error(`Invalid table header: ${heading}`);
    const rows = [];
    for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i += 1) {
      const cells = splitRow(lines[i]);
      if (cells.length !== headers.length) throw new Error(`Invalid column count in ${heading}: ${lines[i]}`);
      rows.push(cells.map((text, column) => {
        const link = text.match(/^\[([^\]]+)\]\((https?:\/\/.+)\)$/);
        if (link) return { value: link[1], url: link[2] };
        // IDs and model numbers remain text, including leading zeroes.
        const numeric = alignments[column].endsWith(':') && headers[column] !== 'Inventory ID';
        return { value: numeric && /^-?\d+(?:\.\d+)?$/.test(text) ? Number(text) : text };
      }));
    }
    i -= 1;
    tables.push({ heading, headers, rows });
  }
  return tables;
}

async function loadArtifactTool() {
  const modules = process.env.ARTIFACT_TOOL_NODE_MODULES || path.join(os.homedir(),
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'gymory-equipment-excel-'));
  try {
    await fs.symlink(modules, path.join(workspace, 'node_modules'), 'dir');
    const require = createRequire(path.join(workspace, 'export.mjs'));
    const [artifact, zip, xml] = await Promise.all([
      import(pathToFileURL(require.resolve('@oai/artifact-tool')).href),
      import(pathToFileURL(require.resolve('jszip')).href),
      import(pathToFileURL(require.resolve('xml-js')).href),
    ]);
    return { ...artifact, JSZip: zip.default, xml: xml.default ?? xml };
  } catch (cause) {
    throw new Error('Excel export requires @oai/artifact-tool. Use the Codex runtime or set ARTIFACT_TOOL_NODE_MODULES to its node_modules directory.', { cause });
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

function columnLetter(index) {
  let result = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    result = String.fromCharCode(65 + (n - 1) % 26) + result;
  }
  return result;
}

function sheetName(heading, used) {
  const base = heading.replace(/[\[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Table';
  let name = base;
  for (let suffix = 2; used.has(name.toLowerCase()); suffix += 1) {
    const tail = ` (${suffix})`;
    name = base.slice(0, 31 - tail.length) + tail;
  }
  used.add(name.toLowerCase());
  return name;
}

const literal = (value) => typeof value === 'string' && value.startsWith('=') ? `'${value}` : value;

// The runtime exposes HYPERLINK but does not implement its calculation or a
// native hyperlink authoring API. Add that missing feature to the XLSX package;
// Artifact Tool still owns workbook creation, data, formatting and tables.
async function addNativeHyperlinks(bytes, sheetLinks, { JSZip, xml }) {
  const zip = await JSZip.loadAsync(bytes);
  const parse = async (name) => xml.xml2js(await zip.file(name).async('string'), { compact: true });
  const children = (node, localName) => node[Object.keys(node).find((key) => key.split(':').at(-1) === localName)];
  const array = (node) => node == null ? [] : Array.isArray(node) ? node : [node];
  const workbook = children(await parse('xl/workbook.xml'), 'workbook');
  const relationships = children(await parse('xl/_rels/workbook.xml.rels'), 'Relationships');
  const targets = new Map(array(children(relationships, 'Relationship')).map((node) => [node._attributes.Id, node._attributes.Target]));
  for (const sheet of array(children(children(workbook, 'sheets'), 'sheet'))) {
    const links = sheetLinks.get(sheet._attributes.name);
    if (!links?.length) continue;
    const target = targets.get(sheet._attributes['r:id']);
    if (!target) throw new Error(`Missing worksheet relationship: ${sheet._attributes.name}`);
    const sheetPath = target.startsWith('/') ? target.slice(1) : path.posix.join('xl', target);
    const relPath = path.posix.join(path.posix.dirname(sheetPath), '_rels', path.posix.basename(sheetPath) + '.rels');
    const doc = await parse(sheetPath);
    const rootKey = Object.keys(doc).find((key) => key.split(':').at(-1) === 'worksheet');
    const root = doc[rootKey];
    const prefix = rootKey.includes(':') ? rootKey.split(':')[0] + ':' : '';
    root._attributes['xmlns:r'] = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const relDoc = zip.file(relPath) ? await parse(relPath) : {
      Relationships: { _attributes: { xmlns: 'http://schemas.openxmlformats.org/package/2006/relationships' } },
    };
    const relRoot = children(relDoc, 'Relationships');
    const rels = array(children(relRoot, 'Relationship'));
    const ids = new Set(rels.map((rel) => rel._attributes.Id));
    const hyperlinks = [];
    for (const [index, link] of links.entries()) {
      let id = `GymoryHyperlink${index + 1}`;
      while (ids.has(id)) id += '_';
      ids.add(id);
      // xml-js escapes quotes but leaves ampersands in attribute values alone.
      const targetUrl = link.url.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      rels.push({ _attributes: { Id: id, Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', Target: targetUrl, TargetMode: 'External' } });
      hyperlinks.push({ _attributes: { ref: link.cell, 'r:id': id } });
    }
    relRoot.Relationship = rels;
    // SpreadsheetML requires hyperlinks before page settings and drawings.
    const afterHyperlinks = new Set(['printOptions', 'pageMargins', 'pageSetup', 'headerFooter', 'rowBreaks', 'colBreaks', 'customProperties', 'cellWatches', 'ignoredErrors', 'smartTags', 'drawing', 'legacyDrawing', 'legacyDrawingHF', 'picture', 'oleObjects', 'controls', 'webPublishItems', 'tableParts', 'extLst']);
    const ordered = {};
    let inserted = false;
    for (const [key, value] of Object.entries(root)) {
      if (!inserted && afterHyperlinks.has(key.split(':').at(-1))) {
        ordered[prefix + 'hyperlinks'] = { [prefix + 'hyperlink']: hyperlinks };
        inserted = true;
      }
      ordered[key] = value;
    }
    if (!inserted) ordered[prefix + 'hyperlinks'] = { [prefix + 'hyperlink']: hyperlinks };
    doc[rootKey] = ordered;
    const worksheetXml = xml.js2xml(doc, { compact: true });
    const relationshipXml = xml.js2xml(relDoc, { compact: true });
    xml.xml2js(worksheetXml, { compact: true });
    xml.xml2js(relationshipXml, { compact: true });
    zip.file(sheetPath, worksheetXml);
    zip.file(relPath, relationshipXml);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function exportReport(markdownPath, { previewDir } = {}) {
  const tables = parseMarkdownTables(await fs.readFile(markdownPath, 'utf8'));
  if (!tables.length) throw new Error(`No Markdown tables found in ${markdownPath}`);
  const dependencies = await loadArtifactTool();
  const { SpreadsheetFile, Workbook } = dependencies;
  const workbook = Workbook.create();
  const names = new Set();
  const sheets = [];
  const sheetLinks = new Map();
  for (const [index, table] of tables.entries()) {
    const sheet = workbook.worksheets.add(sheetName(table.heading, names));
    const links = [];
    const lastColumn = columnLetter(table.headers.length - 1);
    const lastRow = table.rows.length + 4;
    const extent = `A4:${lastColumn}${lastRow}`;
    const matrix = [table.headers, ...table.rows.map((row) => row.map((cell) => literal(cell.value)))];
    sheet.getRange(extent).values = matrix;
    sheet.showGridLines = false;
    const used = sheet.getRange(`A2:${lastColumn}${lastRow}`);
    used.format.font = { name: 'Arial', size: 10, color: '#243B53' };
    used.format.verticalAlignment = 'center';
    sheet.getRange('A2').values = [[table.heading]];
    sheet.getRange('A2').format.font = { name: 'Arial', size: 14, bold: true };
    sheet.getRange(`A2:${lastColumn}2`).format.borders = {
      bottom: { style: 'thin', color: '#BCCCDC' },
    };
    const nativeTable = sheet.tables.add(extent, true, `EquipmentResearch${index + 1}`);
    nativeTable.style = 'TableStyleMedium2';
    nativeTable.showFilterButton = true;
    const header = sheet.getRange(`A4:${lastColumn}4`);
    header.format.fill = '#243B53';
    header.format.font = { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' };
    header.format.horizontalAlignment = 'center';
    header.format.wrapText = true;
    header.format.rowHeight = table.headers.length > 2 ? 44 : 28;
    const widths = table.headers.map((name) => {
      if (name === '#') return 7;
      if (name === 'Inventory ID') return 14;
      if (name === 'Brand') return 23;
      if (name === 'Source model') return 28;
      if (name === 'Source name' || name === 'Official name' || name === 'First candidate') return 46;
      if (name === 'Status') return 42;
      if (name.endsWith('image') || name === 'Official source') return 18;
      return Math.max(12, Math.min(28, name.length + 2));
    });
    for (let column = 0; column < widths.length; column += 1) {
      const range = sheet.getRangeByIndexes(3, column, table.rows.length + 1, 1);
      range.format.columnWidth = widths[column];
      if (table.headers[column] === 'Inventory ID' || table.headers[column] === 'Source model') {
        range.setNumberFormat('@');
      } else if (table.rows.some((row) => typeof row[column].value === 'number')) {
        range.setNumberFormat('#,##0');
      }
    }
    if (table.rows.length) {
      sheet.getRange(`A5:${lastColumn}${lastRow}`).format.wrapText = true;
      for (const [row, cells] of table.rows.entries()) {
        const lines = Math.max(...cells.map((cell, column) => Math.ceil(String(cell.value).length / (widths[column] - 2))));
        sheet.getRangeByIndexes(row + 4, 0, 1, widths.length).format.rowHeight = Math.max(24, lines * 14 + 8);
        for (const [column, cell] of cells.entries()) {
          if (cell.url) {
            const target = sheet.getCell(row + 4, column);
            links.push({ cell: `${columnLetter(column)}${row + 5}`, url: cell.url });
            target.format.font = { name: 'Arial', size: 10, color: '#1D4ED8', underline: 'single' };
          }
        }
      }
    }
    if (table.rows.length > 20) {
      sheet.freezePanes.freezeRows(4);
      sheet.freezePanes.freezeColumns(table.headers[0] === '#' ? 3 : 1);
    }
    sheets.push({ name: sheet.name, rows: table.rows.length, columns: widths.length });
    sheetLinks.set(sheet.name, links);
  }
  workbook.recalculate();
  if (previewDir) {
    await fs.mkdir(previewDir, { recursive: true });
    for (const sheet of sheets) {
      const range = `A1:${columnLetter(sheet.columns - 1)}${Math.min(10, sheet.rows + 4)}`;
      const preview = await workbook.render({ sheetName: sheet.name, range, scale: 1.5, format: 'png' });
      await fs.writeFile(path.join(previewDir, `${sheet.name}.png`), new Uint8Array(await preview.arrayBuffer()));
    }
    const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 20 }, maxChars: 2000 });
    console.log(errors.ndjson);
  }
  const output = markdownPath.replace(/\.md$/i, '') + '.xlsx';
  const file = await SpreadsheetFile.exportXlsx(workbook);
  // Save atomically so a failed export cannot leave a half-written workbook.
  const temporary = `${output}.${process.pid}.tmp`;
  try {
    await file.save(temporary);
    await fs.writeFile(temporary, await addNativeHyperlinks(await fs.readFile(temporary), sheetLinks, dependencies));
    await fs.rename(temporary, output);
  } finally {
    await fs.rm(temporary, { force: true });
    await fs.rm(`${temporary}.inspect.ndjson`, { force: true });
  }
  console.log(JSON.stringify({ output, sheets }));
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const markdownPath = process.argv[2];
  if (!markdownPath) throw new Error('Usage: node export-equipment-research-excel.mjs REPORT.md [--preview-dir DIRECTORY]');
  const previewIndex = process.argv.indexOf('--preview-dir');
  await exportReport(path.resolve(markdownPath), {
    previewDir: previewIndex < 0 ? undefined : process.argv[previewIndex + 1],
  });
}
