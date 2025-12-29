#!/usr/bin/env node

/*
 * generate.js
 *
 * Generate locale JSON files from Google Sheets
 *
 * Usage:
 *       npm script bin/generate.js --credentials ./credentials.json \
 *        --sheet <YOUR_GOOGLE_SHEET_ID> \
 *        --type=[ts|js] \
 *        --prefix=app \
 *        --output=src/locales \
 *        --author='Author Name <email>' \
 *        --comment='Generated from Google Sheets' \
 *        --context='From Google Sheets'
 *        --meta='{"@@project":"My Project"}' \
 *        --meta-file=./globalMeta.json \
 *        --ignore='help,backend-.*,temp-.*' \
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Logger
const log = (...args: unknown[]) => console.log('[INFO]', ...args);
const err = (...args: unknown[]) => console.error('[ERROR]', ...args);

// Types
interface SheetValues {
  title: string;
  values: unknown[][];
}

// Sanitize keys
function sanitize(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Get column name from index (0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, etc.)
function getColumnNameFromIndex(index: number): string {
  let name = '';
  while (index >= 0) {
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26) - 1;
  }
  return name;
}

// Build ignore patterns from a comma-separated string
function buildIgnorePatterns(patternString: string | undefined): RegExp[] {
  if (!patternString) {
    return [];
  }
  return patternString
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      try {
        return new RegExp(p);
      } catch {
        err(`Invalid ignore pattern "${p}", skipping`);
        return null;
      }
    })
    .filter((re): re is RegExp => re !== null);
}

// Fetch spreadsheet data
async function fetchSpreadsheet(
  auth: any,
  spreadsheetId: string,
  ignorePatterns: RegExp[] = []
): Promise<SheetValues[]> {
  const sheetsApi = google.sheets({ version: 'v4', auth });
  let meta;
  try {
    meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
  } catch (e: any) {
    const status = e && e.response && e.response.status;
    if (status === 403) {
      err('Google Sheets API returned 403 (forbidden).');
      err('Please make sure the spreadsheet is shared with the service account');
      err('from your credentials.json (at least Viewer access).');
    } else if (status === 404) {
      err('Google Sheets API returned 404 (not found).');
      err('Please verify the --sheet (spreadsheetId) argument is correct.');
    } else {
      err(`Error fetching spreadsheet metadata: ${e}`);
    }
    process.exit(1);
  }

  const sheetList = meta.data.sheets ?? [];
  const result: SheetValues[] = [];
  let skippedByInsufficient = 0;
  let skippedByIgnore = 0;
  let index = 0;

  const maxConcurrent = Math.min(6, Math.max(1, sheetList.length));

  async function worker(): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const currentIndex = index++;
      if (currentIndex >= sheetList.length) break;
      const sheet = sheetList[currentIndex];
      const title = sheet.properties?.title;
      if (!title) {
        err('Skipping sheet with missing title');
        continue;
      }
      if (ignorePatterns.some((re) => re.test(title))) {
        log(`Ignoring sheet "${title}" as it matches ignore patterns`);
        skippedByIgnore++;
        continue;
      }
      try {
        const resp = await sheetsApi.spreadsheets.values.get({ spreadsheetId, range: title });
        const values = resp.data.values;
        if (!values || values.length < 2 || values[0].length < 4) {
          err(`Sheet "${title}" has insufficient data, skipping`);
          skippedByInsufficient++;
          continue;
        }
        result.push({ title, values });
      } catch (e) {
        err(`Error fetching values for sheet "${title}": ${e}`);
      }
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < maxConcurrent; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  log(
    `Spreadsheet summary: total sheets=${sheetList.length}, usable=${result.length}, ignored=${skippedByIgnore}, insufficient=${skippedByInsufficient}`
  );
  return result;
}

// Build localization table
async function generateLocalizationTable(
  sheets: SheetValues[]
): Promise<Record<string, Record<string, Record<string, unknown>>>> {
  const buckets: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const { title, values } of sheets) {
    const bucket = sanitize(title);
    buckets[bucket] = {};
    const header = values[0] as unknown[];
    const locales: (string | null)[] = [];
    for (let i = 3; i < header.length; i++) {
      const loc = header[i];
      if (typeof loc === 'string' && loc.trim()) {
        const locale = sanitize(loc);
        buckets[bucket][locale] = {};
        locales[i] = locale;
      } else {
        err(`Invalid locale header at column ${getColumnNameFromIndex(i)}, ignoring`);
        locales[i] = null;
      }
    }
    let skippedEmptyRows = 0;
    let skippedEmptyLabels = 0;
    let processedRows = 0;

    for (let r = 1; r < values.length; r++) {
      const row = (values[r] as unknown[]) || [];
      if (row.length === 0 || row.every((cell) => cell == null || String(cell).trim() === '')) {
        err(`Sheet "${title}" has empty row ${r + 1}, skipping`);
        skippedEmptyRows++;
        continue;
      }
      if (row.length < 3) {
        err(`Sheet "${title}" has row ${r + 1} with less than 3 base columns, skipping`);
        skippedEmptyRows++;
        continue;
      }
      const label = row[0];
      if (typeof label !== 'string' || !label.trim()) {
        err(`Empty label at row ${r + 1}, skipping`);
        skippedEmptyLabels++;
        continue;
      }

      const key = sanitize(label);
      const metaRaw = row[2] ?? '';
      let metaObj: Record<string, unknown> | null = null;
      let metaText: string | null = null;
      if (typeof metaRaw === 'string') {
        const trimmed = metaRaw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            metaObj = JSON.parse(trimmed) as Record<string, unknown>;
          } catch {
            err(`Invalid JSON in meta at row ${r + 1}`);
          }
        } else if (trimmed.length > 0) {
          metaText = trimmed;
        }
      }
      for (let c = 3; c < header.length; c++) {
        const locale = locales[c];
        if (!locale) continue;
        const cell = row.length > c ? row[c] : '';
        const text = cell != null ? String(cell) : '';
        buckets[bucket][locale][key] = text;
        if (metaObj && Object.keys(metaObj).length) {
          buckets[bucket][locale][`@${key}`] = metaObj;
        } else if (metaText) {
          buckets[bucket][locale][`@${key}`] = metaText;
        }
      }

      processedRows++;
    }

    log(
      `Sheet "${title}" summary: processed=${processedRows}, skippedEmptyRows=${skippedEmptyRows}, skippedEmptyLabels=${skippedEmptyLabels}`
    );
  }
  return buckets;
}

/**
 * Write JSON localization files, updating the @@last_modified field
 * only when the actual content (minus that timestamp) has changed.
 */
async function writeJsonFiles(
  buckets: Record<string, Record<string, Record<string, unknown>>>,
  outputDir: string,
  prefix: string,
  globalMeta: Record<string, unknown>,
  author?: string,
  commentText?: string,
  contextText?: string
): Promise<void> {
  if (!fs.existsSync(outputDir)) {
    log(`Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let writtenFiles = 0;
  let skippedUpToDate = 0;

  for (const [bucket, locs] of Object.entries(buckets)) {
    const bucketDir = path.join(outputDir, bucket);
    if (!fs.existsSync(bucketDir)) {
      log(`Creating directory: ${bucketDir}`);
      fs.mkdirSync(bucketDir, { recursive: true });
    }

    for (const [locale, messages] of Object.entries(locs)) {
      const fileName = `${prefix ? prefix + '_' : ''}${locale}.json`;
      const filePath = path.join(bucketDir, fileName);

      const body = {
        '@@locale': locale,
        '@@author': author ?? '',
        '@@comment': commentText ?? '',
        '@@context': contextText ?? '',
        ...globalMeta,
        ...messages,
      };

      const newBody = JSON.stringify(body, null, 2);

      if (fs.existsSync(filePath)) {
        try {
          const oldText = fs.readFileSync(filePath, 'utf8');
          const oldObj = JSON.parse(oldText) as Record<string, unknown>;
          delete (oldObj as any)['@@last_modified'];
          const oldBody = JSON.stringify(oldObj, null, 2);

          if (oldBody === newBody) {
            log(`JSON file is up to date, skipping rewrite: ${filePath}`);
            skippedUpToDate++;
            continue;
          }
        } catch {
          // fall through to rewrite
        }
      }

      const bodyWithTimestamp = {
        '@@locale': locale,
        '@@author': author ?? '',
        '@@last_modified': new Date().toISOString(),
        '@@comment': commentText ?? '',
        '@@context': contextText ?? '',
        ...globalMeta,
        ...messages,
      };
      const finalText = JSON.stringify(bodyWithTimestamp, null, 2) + '\n';
      fs.writeFileSync(filePath, finalText, 'utf8');
      log(`Written ${filePath}`);
      writtenFiles++;
    }
  }

  log(`JSON write summary: written=${writtenFiles}, skippedUpToDate=${skippedUpToDate}`);
}

// Generate index.ts file
async function generateIndexTs(outputDir: string, prefix: string): Promise<void> {
  const indexPath = path.join(outputDir, 'index.ts');
  const buckets = fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const localesVar = 'locales';

  const lines: string[] = [
    '// This file is generated, do not edit it manually!',
    '',
    `export const ${localesVar}: Record<string, Record<string, () => Promise<{ default: any }>>> = {`,
  ];

  for (const bucket of buckets) {
    lines.push(`  '${bucket}': {`);
    const files = fs.readdirSync(path.join(outputDir, bucket)).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const locale = f.replace(new RegExp(`^${prefix}_?`), '').replace(/\.json$/, '');
      lines.push(`    '${locale}': () => import('./${bucket}/${f}'),`);
    }
    lines.push('  },');
  }
  lines.push('};', '');

  lines.push('/**', ' * Load all locales at once.', ' * @returns Promise<Record<string, Record<string, any>>>', ' */');
  lines.push('export async function loadLocales(): Promise<Record<string, Record<string, any>>> {');
  lines.push('  const result: Record<string, Record<string, any>> = {};');
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
async function generateIndexJs(outputDir: string, prefix: string): Promise<void> {
  const indexPath = path.join(outputDir, 'index.js');
  const buckets = fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const localesVar = 'locales';

  const lines: string[] = ['// This file is generated, do not edit it manually!', '', `export const ${localesVar} = {`];
  for (const bucket of buckets) {
    lines.push(`  '${bucket}': {`);
    const files = fs.readdirSync(path.join(outputDir, bucket)).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const locale = f.replace(new RegExp(`^${prefix}_?`), '').replace(/\.json$/, '');
      lines.push(`    '${locale}': () => import('./${bucket}/${f}'),`);
    }
    lines.push('  },');
  }
  lines.push('};', '');

  lines.push('/**', ' * Load all locales at once.', ' * @returns Promise<Record<string, Record<string, any>>>', ' */');
  lines.push('export async function loadLocales() {');
  lines.push('  const result: Record<string, Record<string, any>> = {};');
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

/// Help message for the command line arguments
const help = `
Localization Generator

Generate JSON files from Google Sheets.
This script uses the Google Sheets API to fetch
the localization table from a spreadsheet and generates JSON files for localization.
You need to create a service account and download the credentials JSON file.
You can find more information about how to create a service account here:
https://cloud.google.com/docs/authentication/getting-started#creating_a_service_account

Usage: node bin/generate.js [options]
`;

// Main
async function main(): Promise<void> {
  log('Reading command line arguments...');
  const argv = yargs(hideBin(process.argv))
    .scriptName('sheety-localization-generate')
    .usage('Usage: $0 --credentials ./credentials.json --sheet <SPREADSHEET_ID> [options]')
    .option('credentials', {
      alias: ['c', 'key', 'keyfile', 'cred', 'creds', 'secret'],
      type: 'string',
      demandOption: true,
      describe: 'Path to service account credentials JSON file',
      default: 'credentials.json',
    })
    .option('sheet', {
      alias: ['s', 'spreadsheet', 'spreadsheet-id', 'table', 'source', 'id'],
      type: 'string',
      demandOption: true,
      describe: 'Google Spreadsheet ID',
    })
    .option('output', {
      alias: ['o', 'out', 'dir'],
      type: 'string',
      default: 'src/locales',
      describe: 'Output directory for generated locale files',
    })
    .option('prefix', {
      alias: ['p', 'bucket-prefix'],
      type: 'string',
      default: '',
      describe: 'Prefix for locale file names (e.g. app_en.json)',
    })
    .option('meta', {
      alias: ['m', 'global-meta'],
      type: 'string',
      default: '{}',
      describe: 'Global meta JSON string merged into every locale file',
    })
    .option('meta-file', {
      alias: ['metaPath', 'meta-json'],
      type: 'string',
      describe: 'Path to JSON file with global meta (overrides --meta if provided)',
    })
    .option('type', {
      alias: ['t', 'index-type'],
      choices: ['js', 'ts'] as const,
      default: 'js' as const,
      describe: 'Type of generated index file (js or ts)',
    })
    .option('author', { type: 'string', describe: 'Author metadata stored under @@author' })
    .option('comment', { type: 'string', describe: 'Comment metadata stored under @@comment' })
    .option('context', { type: 'string', describe: 'Context metadata stored under @@context' })
    .option('ignore', {
      alias: ['i', 'ignore-table', 'exclude', 'skip'],
      type: 'string',
      default: '',
      describe: 'Comma-separated list of RegExp patterns to ignore sheet titles (e.g. "help,backend-.*,temp-.*")',
    })
    .help('help')
    .alias('help', 'h')
    .epilog(help)
    .parseSync();

  const { credentials, sheet, output, prefix, meta, metaFile, type, author, comment, context, ignore } =
    argv as unknown as {
      credentials: string;
      sheet: string;
      output: string;
      prefix: string;
      meta: string;
      metaFile?: string;
      type: 'js' | 'ts';
      author?: string;
      comment?: string;
      context?: string;
      ignore?: string;
    };

  if (!credentials || !sheet || !type) {
    err('Missing required arguments. Use --help for usage information.');
    process.exit(1);
  }

  let globalMeta: Record<string, unknown> = {};
  if (metaFile) {
    try {
      const metaText = fs.readFileSync(metaFile, 'utf8');
      globalMeta = JSON.parse(metaText) as Record<string, unknown>;
    } catch (e) {
      err(`Failed to read meta from file "${metaFile}": ${e}`);
    }
  } else if (meta) {
    try {
      globalMeta = JSON.parse(meta) as Record<string, unknown>;
    } catch {
      err('Invalid --meta JSON');
    }
  }

  log(`Credentials path: ${path.resolve(credentials)}`);
  if (!fs.existsSync(credentials)) {
    err(`Missing credentials file at ${credentials}`);
    process.exit(1);
  }

  log('Extracting credentials from file...');
  let keyFile: Record<string, unknown>;
  try {
    keyFile = JSON.parse(fs.readFileSync(credentials, 'utf8')) as Record<string, unknown>;
  } catch (e) {
    err(`Error reading credentials file: ${e}`);
    process.exit(1);
  }

  log('Creating Google Sheets API client...');
  let auth: any;
  try {
    auth = await new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    }).getClient();
  } catch (e: any) {
    const message = e && e.message ? String(e.message) : String(e);
    if (message.includes('invalid_grant') && message.includes('Invalid JWT Signature')) {
      err('Error creating Google Sheets API client: invalid or revoked service account key in credentials.json.');
      err('The example credentials bundled with this project are not intended for real use.');
      err('Please create your own service account JSON in Google Cloud Console,');
      err('download the key file, place it as example/credentials.json, and share your sheet');
      err('with the service account email from that file (as Viewer or higher).');
    } else {
      err(`Error creating Google Sheets API client: ${e}`);
    }
    process.exit(1);
  }

  log('Fetching spreadsheet data...');
  const ignorePatterns = buildIgnorePatterns(ignore);
  const sheets = await fetchSpreadsheet(auth, sheet, ignorePatterns);
  if (!sheets.length) {
    err('No sheets found');
    process.exit(1);
  }

  log(`Retrieving data from ${sheets.length} sheets...`);

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

  log(`Successfully generated localization files for ${Object.keys(buckets).length} buckets.`);
}

main().catch((e) => {
  err(e);
  process.exit(1);
});
