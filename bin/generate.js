#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { buildGeneratedManifest, countBucketPlaceholders, createJsIndexSource, createTsIndexSource, logManifestSummary, mapPlaceholderType, } from './generator/manifest.js';
import { cleanupStaleIndexFiles, generateIndexJs, generateIndexTs, writeJsonFiles, } from './generator/output.js';
import { buildIgnorePatterns, fetchSpreadsheet, generateLocalizationData, generateLocalizationTable, } from './generator/spreadsheet.js';
import { err, getBaseLocale, listFilesRecursive, log, normalizeMessageMeta, } from './generator/shared.js';
const help = `
Localization Generator

Generate JSON files from Google Sheets.
This script uses the Google Sheets API to fetch
the localization table from a spreadsheet and generates JSON files for localization.

Usage: node bin/generate.js [options]
`;
function exitWithError(message) {
    err(message);
    process.exit(1);
}
/** Parse inline global metadata while preserving an object-shaped JSON root. */
function parseMeta(metaText) {
    if (!metaText) {
        return {};
    }
    try {
        const parsed = JSON.parse(metaText);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    }
    catch (error) {
        exitWithError(`Failed to parse --meta JSON: ${error}`);
    }
}
/**
 * Read global metadata from disk without letting non-object JSON replace the
 * generated locale dictionary root.
 */
function readMetaFile(metaFilePath) {
    if (!metaFilePath) {
        return {};
    }
    try {
        const metaText = fs.readFileSync(metaFilePath, 'utf8');
        const parsed = JSON.parse(metaText);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    }
    catch (error) {
        exitWithError(`Failed to read --meta-file ${metaFilePath}: ${error}`);
    }
}
/**
 * Detect direct CLI execution after resolving npm's symlinked bin entry.
 * Keeping this check separate lets tests import the module without running the
 * command as a side effect.
 */
export function isExecutedDirectly() {
    const entryPath = process.argv[1];
    if (!entryPath) {
        return false;
    }
    const resolvedEntryPath = fs.realpathSync.native(path.resolve(entryPath));
    const resolvedModulePath = fs.realpathSync.native(path.resolve(fileURLToPath(import.meta.url)));
    return resolvedEntryPath === resolvedModulePath;
}
/**
 * Run the read-only Google Sheets generation pipeline and write its validated
 * locale dictionaries, manifest, runtime index, and bundled formatter.
 */
export async function main() {
    var _a;
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
        describe: 'Generate empty-string translations and @meta entries for missing locale cells instead of omitting them',
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
    const prefix = String((_a = argv.prefix) !== null && _a !== void 0 ? _a : '');
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
    }
    catch (error) {
        const message = String(error);
        if (message.includes('invalid_grant')) {
            err('Error creating Google Sheets API client: invalid or revoked service account key in credentials.json.');
            err('The example credentials bundled with this project are not intended for real use.');
            process.exit(1);
            return;
        }
        exitWithError(`Error creating Google Sheets API client: ${error}`);
    }
    const sheets = await fetchSpreadsheet(authClient, String(argv.sheet), ignorePatterns);
    if (!sheets.length) {
        exitWithError('No sheets found');
    }
    const { buckets, bucketSourceLocales } = await generateLocalizationData(sheets, {
        includeEmpty: argv['include-empty'],
    });
    const manifest = buildGeneratedManifest(buckets, outputDir, prefix, bucketSourceLocales);
    if (!manifest.localeNames.length) {
        exitWithError('No locales found in processed sheets.');
    }
    const finalManifest = await writeJsonFiles(buckets, outputDir, prefix, globalMeta, argv.author, argv.comment, argv.context, manifest, {
        includeLastModified: argv['last-modified'],
        modifiedAt: argv.modified,
    });
    logManifestSummary(finalManifest);
    if (type === 'ts') {
        log('Generating index.ts...');
        await generateIndexTs(outputDir, finalManifest);
    }
    else {
        log('Generating index.js...');
        await generateIndexJs(outputDir, finalManifest);
    }
    cleanupStaleIndexFiles(outputDir, type);
    log(`Successfully generated localization files for ${finalManifest.bucketNames.length} buckets.`);
}
/** Stable source-level hooks used by the split Jest suites. */
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
    generateLocalizationData,
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
//# sourceMappingURL=generate.js.map