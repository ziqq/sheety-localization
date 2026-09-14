#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { err, log } from './generator/shared.js';
import { buildIgnorePatterns } from './generator/spreadsheet.js';
import { OpenAIClient } from './localize/client.js';
import { extractEmptyCells, localizeRows } from './localize/pipeline.js';
import { GoogleSheetsGateway, RateLimiter, updatesForRow, writeLocalizedRow, } from './localize/sheets.js';
/** Read and trim an optional token or prompt file, failing on a stale path. */
function readOptionalFile(filePath) {
    if (!filePath) {
        return undefined;
    }
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`File does not exist: ${resolved}`);
    }
    return fs.readFileSync(resolved, 'utf8').trim();
}
/** Resolve npm bin symlinks so importing this module never starts the CLI. */
function isExecutedDirectly() {
    const entryPath = process.argv[1];
    if (!entryPath) {
        return false;
    }
    return (fs.realpathSync.native(path.resolve(entryPath)) ===
        fs.realpathSync.native(path.resolve(fileURLToPath(import.meta.url))));
}
/**
 * Find empty target cells, request validated translations, and optionally write
 * accepted values back to Sheets. Dry-run is the default and uses read-only
 * Google credentials even though it still performs real OpenAI requests.
 */
export async function main() {
    var _a, _b, _c, _d;
    const argv = await yargs(hideBin(process.argv))
        .scriptName('sheety-localize')
        .option('credentials', {
        alias: 'c',
        type: 'string',
        default: 'credentials.json',
        describe: 'Path to Google service account credentials JSON file',
    })
        .option('sheet', {
        alias: 's',
        type: 'string',
        demandOption: true,
        describe: 'Google Sheets spreadsheet id',
    })
        .option('token', {
        alias: 't',
        type: 'string',
        describe: 'OpenAI API key (or use OPENAI_API_KEY)',
    })
        .option('token-file', {
        type: 'string',
        describe: 'Path to a file containing the OpenAI API key',
    })
        .option('model', {
        alias: 'm',
        type: 'string',
        default: 'gpt-5-mini',
        describe: 'OpenAI model',
    })
        .option('prompt', {
        alias: 'p',
        type: 'string',
        describe: 'Path to optional OpenAI instructions',
    })
        .option('ignore', {
        alias: 'i',
        type: 'string',
        describe: 'Comma-separated sheet-name regex patterns to ignore',
    })
        .option('batch', {
        alias: 'b',
        type: 'number',
        default: 3,
        describe: 'Target languages per OpenAI request',
    })
        .option('workers', {
        alias: 'w',
        type: 'number',
        default: 6,
        describe: 'Maximum concurrent OpenAI requests',
    })
        .option('timeout', {
        type: 'number',
        default: 120,
        describe: 'OpenAI request timeout in seconds',
    })
        .option('write', {
        type: 'boolean',
        default: false,
        describe: 'Write accepted translations to Google Sheets',
    })
        .strict()
        .help()
        .parse();
    const credentialsPath = path.resolve(argv.credentials);
    if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Credentials file does not exist: ${credentialsPath}`);
    }
    const apiKey = (_c = (_a = readOptionalFile(argv['token-file'])) !== null && _a !== void 0 ? _a : (_b = argv.token) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : (_d = process.env.OPENAI_API_KEY) === null || _d === void 0 ? void 0 : _d.trim();
    if (!apiKey) {
        throw new Error('OpenAI API key is required via --token, --token-file, or OPENAI_API_KEY');
    }
    if (!argv.write) {
        log('Dry run: translations will be generated but not written.');
    }
    const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: [
            argv.write
                ? 'https://www.googleapis.com/auth/spreadsheets'
                : 'https://www.googleapis.com/auth/spreadsheets.readonly',
        ],
    });
    const authClient = await auth.getClient();
    const gateway = new GoogleSheetsGateway(authClient, argv.sheet);
    const client = new OpenAIClient({
        apiKey,
        model: argv.model,
        workers: Math.max(1, Math.floor(argv.workers)),
        timeoutMs: Math.max(1, argv.timeout) * 1000,
        systemPrompt: readOptionalFile(argv.prompt),
    });
    const sheets = await gateway.fetch(buildIgnorePatterns(argv.ignore));
    const writeLimiter = argv.write ? new RateLimiter(60) : undefined;
    let candidateRows = 0;
    let translatedCells = 0;
    let writtenRows = 0;
    for (const sheet of sheets) {
        const rows = extractEmptyCells(sheet.title, sheet.values);
        candidateRows += rows.length;
        if (!rows.length) {
            continue;
        }
        log(`Localizing ${rows.length} row(s) in "${sheet.title}"...`);
        const localized = await localizeRows(rows, client, Math.max(1, Math.floor(argv.batch)));
        for (const row of localized) {
            const updates = updatesForRow(sheet.title, row);
            translatedCells += updates.length;
            if (!argv.write) {
                for (const update of updates) {
                    log(`[dry-run] ${update.range} = ${JSON.stringify(update.value)}`);
                }
            }
            else if (await writeLocalizedRow(gateway, sheet.title, row, 3, writeLimiter)) {
                writtenRows++;
            }
        }
    }
    log(`Localization summary: sheets=${sheets.length}, candidateRows=${candidateRows}, translatedCells=${translatedCells}, writtenRows=${writtenRows}, mode=${argv.write ? 'write' : 'dry-run'}`);
}
if (isExecutedDirectly()) {
    main().catch((error) => {
        err(error);
        process.exitCode = 1;
    });
}
//# sourceMappingURL=localize.js.map