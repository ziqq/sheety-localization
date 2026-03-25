#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { google } from 'googleapis';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import {
  buildGeneratedManifest,
  countBucketPlaceholders,
  createJsIndexSource,
  createTsIndexSource,
  logManifestSummary,
  mapPlaceholderType,
} from './generator/manifest.js';
import {
  cleanupStaleIndexFiles,
  generateIndexJs,
  generateIndexTs,
  writeJsonFiles,
} from './generator/output.js';
import {
  buildIgnorePatterns,
  fetchSpreadsheet,
  generateLocalizationTable,
} from './generator/spreadsheet.js';
import {
  err,
  getBaseLocale,
  listFilesRecursive,
  log,
  normalizeMessageMeta,
} from './generator/shared.js';

const help = `
Localization Generator

Generate JSON files from Google Sheets.
This script uses the Google Sheets API to fetch
the localization table from a spreadsheet and generates JSON files for localization.

Usage: node bin/generate.js [options]
`;

function exitWithError(message: string): never {
  err(message);
  process.exit(1);
}

function parseMeta(metaText: string | undefined): Record<string, unknown> {
  if (!metaText) {
    return {};
  }

  try {
    const parsed = JSON.parse(metaText) as Record<string, unknown>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    exitWithError(`Failed to parse --meta JSON: ${error}`);
  }
}

function readMetaFile(
  metaFilePath: string | undefined,
): Record<string, unknown> {
  if (!metaFilePath) {
    return {};
  }

  try {
    const metaText = fs.readFileSync(metaFilePath, 'utf8');
    const parsed = JSON.parse(metaText) as Record<string, unknown>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    exitWithError(`Failed to read --meta-file ${metaFilePath}: ${error}`);
  }
}

export function isExecutedDirectly(): boolean {
  const entryPath = process.argv[1];
  if (!entryPath) {
    return false;
  }

  return (
    path.resolve(entryPath) === path.resolve(fileURLToPath(import.meta.url))
  );
}

export async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('sheety-localization')
    .usage(help)
    .option('credentials', {
      type: 'string',
      demandOption: true,
      describe: 'Path to Google service account credentials JSON file',
    })
    .option('sheet', {
      type: 'string',
      demandOption: true,
      describe: 'Google Sheets spreadsheet id',
    })
    .option('output', {
      type: 'string',
      default: 'src/locales',
      describe: 'Output directory',
    })
    .option('type', {
      type: 'string',
      choices: ['ts', 'js'],
      default: 'ts',
      describe: 'Generated runtime index file type',
    })
    .option('prefix', {
      type: 'string',
      default: '',
      describe: 'Optional locale file prefix',
    })
    .option('author', {
      type: 'string',
      describe: 'Generated file author',
    })
    .option('comment', {
      type: 'string',
      describe: 'Generated file comment',
    })
    .option('context', {
      type: 'string',
      describe: 'Generated file context',
    })
    .option('modified', {
      type: 'string',
      describe: 'Explicit ISO timestamp for @@last_modified metadata',
    })
    .option('meta', {
      type: 'string',
      describe: 'Global metadata JSON',
    })
    .option('meta-file', {
      type: 'string',
      describe: 'Path to global metadata JSON file',
    })
    .option('ignore', {
      type: 'string',
      describe: 'Comma-separated sheet-name regex patterns to ignore',
    })
    .option('include-empty', {
      type: 'boolean',
      default: false,
      describe:
        'Generate empty-string translations and @meta entries for missing locale cells instead of omitting them',
    })
    .option('last-modified', {
      type: 'boolean',
      default: true,
      describe: 'Include @@last_modified metadata in generated locale files',
    })
    .help()
    .parse();

  const credentialsPath = path.resolve(String(argv.credentials));
  if (!fs.existsSync(credentialsPath)) {
    exitWithError(`Missing credentials file at ${credentialsPath}`);
  }

  const outputDir = path.resolve(String(argv.output));
  const prefix = String(argv.prefix ?? '');
  const type = argv.type === 'js' ? 'js' : 'ts';
  const ignorePatterns = buildIgnorePatterns(argv.ignore);
  const globalMeta = argv['meta-file']
    ? readMetaFile(String(argv['meta-file']))
    : parseMeta(argv.meta);

  let authClient;
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    authClient = await auth.getClient();
  } catch (error) {
    const message = String(error);
    if (message.includes('invalid_grant')) {
      err(
        'Error creating Google Sheets API client: invalid or revoked service account key in credentials.json.',
      );
      err(
        'The example credentials bundled with this project are not intended for real use.',
      );
      process.exit(1);
      return;
    }

    exitWithError(`Error creating Google Sheets API client: ${error}`);
  }

  const sheets = await fetchSpreadsheet(
    authClient,
    String(argv.sheet),
    ignorePatterns,
  );
  if (!sheets.length) {
    exitWithError('No sheets found');
  }

  const buckets = await generateLocalizationTable(sheets, {
    includeEmpty: argv['include-empty'],
  });
  const manifest = buildGeneratedManifest(buckets, outputDir, prefix);
  if (!manifest.localeNames.length) {
    exitWithError('No locales found in processed sheets.');
  }

  const finalManifest = await writeJsonFiles(
    buckets,
    outputDir,
    prefix,
    globalMeta,
    argv.author,
    argv.comment,
    argv.context,
    manifest,
    {
      includeLastModified: argv['last-modified'],
      modifiedAt: argv.modified,
    },
  );
  logManifestSummary(finalManifest);

  if (type === 'ts') {
    log('Generating index.ts...');
    await generateIndexTs(outputDir, finalManifest);
  } else {
    log('Generating index.js...');
    await generateIndexJs(outputDir, finalManifest);
  }

  cleanupStaleIndexFiles(outputDir, type);
  log(
    `Successfully generated localization files for ${finalManifest.bucketNames.length} buckets.`,
  );
}

export const __test__ = {
  buildGeneratedManifest,
  buildIgnorePatterns,
  cleanupStaleIndexFiles,
  countBucketPlaceholders,
  createJsIndexSource,
  createTsIndexSource,
  fetchSpreadsheet,
  generateIndexJs,
  generateIndexTs,
  generateLocalizationTable,
  getBaseLocale,
  isExecutedDirectly,
  listFilesRecursive,
  logManifestSummary,
  main,
  mapPlaceholderType,
  normalizeMessageMeta,
  writeJsonFiles,
};

if (isExecutedDirectly()) {
  main().catch((error) => {
    err(error);
    process.exit(1);
  });
}
