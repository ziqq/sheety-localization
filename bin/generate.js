#!/usr/bin/env node

/*
 * generate.js
 *
 * Generate locale JSON files from Google Sheets
 * Usage:
 *       npm script gin/generate.js --credentials ./credentials.json \
 *        --sheet <YOUR_GOOGLE_SHEET_ID> \
 *        --type=[ts|js] \
 *        --prefix=app \
 *        --output=src/locales \
 *        --author='Author Name <email>' \
 *        --comment='Generated from Google Sheets' \
 *        --context='From Google Sheets'
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
      // const key = sanitize(label);
      // const metaRaw = row[2] || '';
      // let _meta = {};
      // if (typeof metaRaw === 'string' && metaRaw.startsWith('{') && metaRaw.endsWith('}')) {
      //   try {
      //     _meta = JSON.parse(metaRaw);
      //   } catch {
      //     err(`Invalid JSON meta at row ${r + 1}`);
      //   }
      // }
      const key = sanitize(label);
      const metaRaw = row[2] || '';
      let _metaObj = {};
      if (typeof metaRaw === 'string' && metaRaw.trim().startsWith('{') && metaRaw.trim().endsWith('}')) {
        try {
          _metaObj = JSON.parse(metaRaw);
        } catch {
          err(`Invalid JSON in meta at row ${r + 1}`);
        }
      }
      for (let c = 3; c < row.length; c++) {
        const locale = locales[c];
        if (!locale) continue;
        const text = row[c] != null ? String(row[c]) : '';
        buckets[bucket][locale][key] = text;
        if (Object.keys(_metaObj).length) {
          buckets[bucket][locale][`@${key}`] = _metaObj;
        }
      }
    }
  }
  return buckets;
}

/**
 * Write JSON localization files, updating the @@last_modified field
 * only when the actual content (minus that timestamp) has changed.
 */
async function writeJsonFiles(buckets, outputDir, prefix, globalMeta, author, commentText, contextText) {
  for (const [bucket, locs] of Object.entries(buckets)) {
    const bucketDir = path.join(outputDir, bucket);
    fs.mkdirSync(bucketDir, { recursive: true });

    for (const [locale, messages] of Object.entries(locs)) {
      const fileName = `${prefix ? prefix + '_' : ''}${locale}.json`;
      const filePath = path.join(bucketDir, fileName);

      // Build the object without the timestamp
      const body = {
        '@@locale': locale,
        '@@author': author || '',
        '@@comment': commentText || '',
        '@@context': contextText || '',
        ...globalMeta,
        ...messages,
      };

      const newBody = JSON.stringify(body, null, 2);

      // If file exists, compare its content minus the old timestamp
      if (fs.existsSync(filePath)) {
        try {
          const oldText = fs.readFileSync(filePath, 'utf8');
          const oldObj = JSON.parse(oldText);
          delete oldObj['@@last_modified'];
          const oldBody = JSON.stringify(oldObj, null, 2);

          // If nothing but the timestamp changed, skip rewriting
          if (oldBody === newBody) {
            log(`No new JSON files generated for ${filePath}, ` + 'nothing to do, exiting...');
            continue;
          }
        } catch {
          // If parsing fails, fall back to rewriting
        }
      }

      // On new or changed content, add fresh timestamp and write
      const bodyWithTimestamp = {
        '@@locale': locale,
        '@@author': author || '',
        '@@last_modified': new Date().toISOString(),
        '@@comment': commentText || '',
        '@@context': contextText || '',
        ...globalMeta,
        ...messages,
      };
      const finalText = JSON.stringify(bodyWithTimestamp, null, 2) + '\n';
      fs.writeFileSync(filePath, finalText, 'utf8');
      log(`Written ${filePath}`);
    }
  }
}

// Generate index.ts file
async function generateIndexTs(outputDir, prefix) {
  const indexPath = path.join(outputDir, 'index.ts');
  const buckets = fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const localesVar = 'locales';

  const lines = [
    '// This file is generated, do not edit it manually!',
    '',
    `export const ${localesVar}: Record<string, Record<string, () => Promise<{ default: any }>>> = {`,
  ];

  // raw object
  for (const bucket of buckets) {
    lines.push(`  "${bucket}": {`);
    const files = fs.readdirSync(path.join(outputDir, bucket)).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const locale = f.replace(new RegExp(`^${prefix}_?`), '').replace(/\.json$/, '');
      lines.push(`    "${locale}": () => import('./${bucket}/${f}'),`);
    }
    lines.push('  },');
  }
  lines.push('};', '');

  // loadLocales fn
  lines.push('/**', ' * Load all locales at once.', ' * @returns Promise<Record<string, Record<string, any>>>', ' */');
  lines.push('export async function loadLocales(): Promise<Record<string, Record<string, any>>> {');
  lines.push(`  const result: Record<string, Record<string, any>> = {};`);
  lines.push(`  const buckets = Object.keys(${localesVar}) as string[];`);
  lines.push(`  const localeKeys = Object.keys(${localesVar}[buckets[0]]) as string[];`);
  lines.push('');
  lines.push('  for (const locale of localeKeys) {');
  lines.push('    const entries = await Promise.all(');
  lines.push(
    `      buckets.map(bucket => ${localesVar}[bucket][locale]().then(m => [bucket, (m as any).default] as const))`
  );
  lines.push('    );');
  lines.push('    result[locale] = Object.fromEntries(entries);');
  lines.push('  }');
  lines.push('');
  lines.push('  return result;');
  lines.push('}');

  await fs.promises.writeFile(indexPath, lines.join('\n'), 'utf8');
  log(`Written TypeScript locale index at ${indexPath}`);
}

// Generate index.js file
async function generateIndexJs(outputDir, prefix) {
  const indexPath = path.join(outputDir, 'index.js');
  const buckets = fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const localesVar = 'locales';

  const lines = ['// This file is generated, do not edit it manually!', '', `export const ${localesVar} = {`];
  for (const bucket of buckets) {
    lines.push(`  "${bucket}": {`);
    const files = fs.readdirSync(path.join(outputDir, bucket)).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const locale = f.replace(new RegExp(`^${prefix}_?`), '').replace(/\.json$/, '');
      lines.push(`    "${locale}": () => import('./${bucket}/${f}'),`);
    }
    lines.push('  },');
  }
  lines.push('};', '');

  lines.push('/**', ' * Load all locales at once.', ' * @returns Promise<Record<string, Record<string, any>>>', ' */');
  lines.push('export async function loadLocales() {');
  lines.push('  const result = {};');
  lines.push(`  const buckets = Object.keys(${localesVar});`);
  lines.push(`  const localeKeys = Object.keys(${localesVar}[buckets[0]]);`);
  lines.push('');
  lines.push('  for (const locale of localeKeys) {');
  lines.push('    const entries = await Promise.all(');
  lines.push(`      buckets.map(bucket => ${localesVar}[bucket][locale]().then(m => [bucket, m.default]))`);
  lines.push('    );');
  lines.push('    result[locale] = Object.fromEntries(entries);');
  lines.push('  }');
  lines.push('');
  lines.push('  return result;');
  lines.push('}');

  fs.writeFileSync(indexPath, lines.join('\n'), 'utf8');
  log(`Written JavaScript locale index at ${indexPath}`);
}

// Main
async function main() {
  // if (yargs(hideBin(process.argv)).option('help', { alias: 'h', type: 'boolean', default: false }).argv.help == true) {
  //   process.exit(0);
  // }

  log('Reading command line arguments...');
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

  // Validate arguments
  if (credentials == null || sheet == null || type == null) {
    err('Missing required arguments. Use --help for usage information.');
    process.exit(1);
  }

  let globalMeta = {};
  try {
    globalMeta = JSON.parse(meta);
  } catch {
    err('Invalid --meta JSON');
  }

  log(`Credentials path: ${path.resolve(credentials)}`);
  if (!fs.existsSync(credentials)) {
    err(`Missing credentials file at ${credentials}`);
    process.exit(1);
  }

  log('Extracting credentials from file...');
  let keyFile;
  try {
    keyFile = JSON.parse(fs.readFileSync(credentials, 'utf8'));
  } catch (e) {
    err(`Error reading credentials file: ${e}`);
    process.exit(1);
  }

  log('Creating Google Sheets API client...');
  // const auth = await new google.auth.GoogleAuth({
  //   credentials: keyFile,
  //   scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  // }).getClient();
  let auth;
  try {
    auth = await new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    }).getClient();
  } catch (e) {
    err(`Error creating Google Sheets API client: ${e}`);
    process.exit(1);
  }

  log('Fetching spreadsheet data...');
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

/// Help message for the command line arguments
const help = `
Localization Generator

Generate JSON files from Google Sheets.
This script uses the Google Sheets API to fetch
the localization table from a spreadsheet and generates JSON files for localization.
You need to create a service account and download the credentials JSON file.
You can find more information about how to create a service account here:
https://cloud.google.com/docs/authentication/getting-started#creating_a_service_account

Usage: npm run bin/generate.js [options]
`;
