#!/usr/bin/env node

/*
 * generate-locales.js
 *
 * Generate locale JSON files from Google Sheets
 * Usage: node generate-locales.js --credentials path/to/credentials.json --sheet spreadsheet-id \
 *   --output path/to/output --prefix app [--type js|ts] [--author 'Name'] [--comment 'Desc'] [--context 'Ctx'] [--format]
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Logger
const log = console.log;
const err = console.error;

// Sanitize keys
function sanitize(input) {
  return input
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Convert index to column name
function columnName(index) {
  let name = '';
  while (index >= 0) {
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26) - 1;
  }
  return name;
}

// Fetch spreadsheet data
async function fetchSpreadsheet(auth, spreadsheetId) {
  const sheetsApi = google.sheets({ version: 'v4', auth });
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
  const sheetList = meta.data.sheets || [];
  const result = [];
  for (const sheet of sheetList) {
    const title = sheet.properties?.title;
    if (!title) {
      err(`Skipping sheet with missing title`);
      continue;
    }
    const resp = await sheetsApi.spreadsheets.values.get({ spreadsheetId, range: title });
    const values = resp.data.values;
    if (!values || values.length < 2 || values[0].length < 4) {
      err(`Sheet "${title}" has insufficient data, skipping`);
      continue;
    }
    result.push({ title, values });
  }
  return result;
}

// Build localization table
async function generateLocalizationTable(sheets) {
  const buckets = {};
  for (const { title, values } of sheets) {
    const bucket = sanitize(title);
    buckets[bucket] = {};
    const header = values[0];
    const locales = [];
    for (let i = 3; i < header.length; i++) {
      const loc = header[i];
      if (typeof loc === 'string' && loc.trim()) {
        const locale = sanitize(loc);
        buckets[bucket][locale] = {};
        locales[i] = locale;
      } else {
        err(`Invalid locale header at column ${columnName(i)}, ignoring`);
        locales[i] = null;
      }
    }
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      if (row.length < header.length) {
        err(`Row ${r + 1} length mismatch, skipping`);
        continue;
      }
      const label = row[0];
      if (typeof label !== 'string' || !label.trim()) {
        err(`Empty label at row ${r + 1}, skipping`);
        continue;
      }
      const key = sanitize(label);
      const metaRaw = row[2] || '';
      let _meta = {};
      if (typeof metaRaw === 'string' && metaRaw.startsWith('{') && metaRaw.endsWith('}')) {
        try {
          _meta = JSON.parse(metaRaw);
        } catch {
          err(`Invalid JSON meta at row ${r + 1}`);
        }
      }
      for (let c = 3; c < row.length; c++) {
        const locale = locales[c];
        if (!locale) continue;
        const text = row[c] != null ? String(row[c]) : '';
        buckets[bucket][locale][key] = text;
      }
    }
  }
  return buckets;
}

// Write JSON files with metadata header
async function writeJsonFiles(buckets, outputDir, prefix, globalMeta, author, commentText, contextText) {
  const timestamp = new Date().toISOString();
  for (const [bucket, locs] of Object.entries(buckets)) {
    const bucketDir = path.join(outputDir, bucket);
    fs.mkdirSync(bucketDir, { recursive: true });
    for (const [locale, messages] of Object.entries(locs)) {
      const fileName = `${prefix ? prefix + '_' : ''}${locale}.json`;
      const filePath = path.join(bucketDir, fileName);
      const content = {
        '@@locale': locale,
        '@@author': author || '',
        '@@last_modified': timestamp,
        '@@comment': commentText || '',
        '@@context': contextText || '',
        ...globalMeta,
        ...messages,
      };
      const jsonBody = JSON.stringify(content, null, 2);
      const fileText = jsonBody;
      fs.writeFileSync(filePath, fileText, 'utf8');
      log(`Written ${filePath}`);
    }
  }
}

// Generate JS index
async function generateIndexJs(outputDir, prefix) {
  const indexPath = path.join(outputDir, 'index.js');
  const lines = [];
  lines.push('// This file is generated, do not edit it manually!');
  lines.push('export default {');
  const buckets = fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const bucket of buckets) {
    lines.push(`  "${bucket}": {`);
    const files = fs.readdirSync(path.join(outputDir, bucket)).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const locale = f.replace(/\.json$/, '').replace(new RegExp(`^${prefix}_`), '');
      lines.push(`    "${locale}": () => import('./${bucket}/${f}'),`);
    }
    lines.push('  },');
  }
  lines.push('};');
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf8');
  log(`Written ${indexPath}`);
}

// Generate TS index
async function generateIndexTs(outputDir, prefix) {
  const indexPath = path.join(outputDir, 'index.ts');
  const lines = [];
  lines.push('// This file is generated, do not edit it manually!');
  lines.push('');
  lines.push('const locales: Record<string, Record<string, () => Promise<{ default: Record<string, any> }>>> = {');
  const buckets = fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const bucket of buckets) {
    lines.push(`  ${JSON.stringify(bucket)}: {`);
    const files = fs.readdirSync(path.join(outputDir, bucket)).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const locale = f.replace(/\.json$/, '').replace(new RegExp(`^${prefix}_`), '');
      lines.push(`    ${JSON.stringify(locale)}: () => import('./${bucket}/${f}'),`);
    }
    lines.push('  },');
  }
  lines.push('};');
  lines.push('');
  lines.push('export default locales;');
  await fs.promises.writeFile(indexPath, lines.join('\n'), 'utf8');
  log(`Written ${indexPath}`);
}

// Main
async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('credentials', { alias: 'c', type: 'string', demandOption: true })
    .option('sheet', { alias: 's', type: 'string', demandOption: true })
    .option('output', { alias: 'o', type: 'string', default: 'src/locales' })
    .option('prefix', { alias: 'p', type: 'string', default: '' })
    .option('meta', { alias: 'm', type: 'string', default: '{}' })
    .option('type', { alias: 't', choices: ['js', 'ts'], default: 'js', describe: 'index file type' })
    .option('author', { type: 'string', describe: 'Author metadata' })
    .option('comment', { type: 'string', describe: 'Comment metadata' })
    .option('context', { type: 'string', describe: 'Context metadata' })
    .help().argv;

  const { credentials, sheet, output, prefix, meta, type, author, comment, context } = argv;
  let globalMeta = {};
  try {
    globalMeta = JSON.parse(meta);
  } catch {
    err('Invalid --meta JSON');
  }
  if (!fs.existsSync(credentials)) {
    err(`Missing credentials file at ${credentials}`);
    process.exit(1);
  }
  const keyFile = JSON.parse(fs.readFileSync(credentials, 'utf8'));
  const auth = await new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  }).getClient();

  log('Fetching spreadsheet...');
  const sheets = await fetchSpreadsheet(auth, sheet);
  if (!sheets.length) {
    err('No sheets found');
    process.exit(1);
  }
  log('Building localization table...');
  const buckets = await generateLocalizationTable(sheets);

  log('Writing JSON files...');
  await writeJsonFiles(buckets, output, prefix, globalMeta, author, comment, context);

  if (type === 'ts') {
    log('Generating index.ts...');
    await generateIndexTs(output, prefix);
  } else {
    log('Generating index.js...');
    await generateIndexJs(output, prefix);
  }

  log('Done!');
}

main().catch((e) => {
  err(e);
  process.exit(1);
});
