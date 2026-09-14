import { err, isLocaleCode, normalizeLocaleCode, sanitize, } from '../generator/shared.js';
import { buildLocalizationRequest } from '../localize/prompt.js';
import { validateTranslation } from '../localize/validation.js';
function textValue(value) {
    if (typeof value === 'string') {
        return value.trim() || undefined;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return undefined;
}
/**
 * Parse a localization tab and return only rows with a valid source message and
 * at least one empty target locale. Existing translations are never selected or
 * overwritten by the localization pipeline.
 */
export function extractEmptyCells(title, values) {
    var _a;
    if (!values.length || values[0].length < 5) {
        return [];
    }
    const header = values[0];
    const expected = ['label', 'description', 'meta'];
    const hasBaseHeader = expected.every((name, index) => typeof header[index] === 'string' &&
        header[index].trim().toLowerCase() === name);
    const sourceHeader = header[3];
    if (!hasBaseHeader ||
        typeof sourceHeader !== 'string' ||
        !isLocaleCode(sourceHeader)) {
        err(`Sheet "${title}" is not a localization table, skipping`);
        return [];
    }
    const sourceCode = normalizeLocaleCode(sourceHeader);
    const localeColumns = new Map();
    const seenLocales = new Set([sourceCode]);
    for (let column = 4; column < header.length; column++) {
        const value = header[column];
        if (typeof value !== 'string' || !isLocaleCode(value)) {
            err(`Sheet "${title}" has an invalid locale in column ${column + 1}`);
            continue;
        }
        const code = normalizeLocaleCode(value);
        if (seenLocales.has(code)) {
            err(`Sheet "${title}" has a duplicate locale "${code}"`);
            continue;
        }
        seenLocales.add(code);
        localeColumns.set(column, code);
    }
    const rows = [];
    const seenLabels = new Set();
    for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
        const row = (_a = values[rowIndex]) !== null && _a !== void 0 ? _a : [];
        const rawLabel = row[0];
        if (typeof rawLabel !== 'string' || !rawLabel.trim()) {
            continue;
        }
        const label = sanitize(rawLabel);
        if (!label || seenLabels.has(label)) {
            continue;
        }
        seenLabels.add(label);
        const source = textValue(row[3]);
        if (!source) {
            err(`Sheet "${title}" has no source text in row ${rowIndex + 1}`);
            continue;
        }
        const cells = [...localeColumns]
            .filter(([column]) => {
            const value = row[column];
            return value == null || (typeof value === 'string' && !value.trim());
        })
            .map(([column, code]) => ({ column, code, text: '' }));
        if (!cells.length) {
            continue;
        }
        rows.push({
            row: rowIndex,
            label,
            description: textValue(row[1]),
            meta: textValue(row[2]),
            sourceCode,
            source,
            cells,
        });
    }
    return rows;
}
/**
 * Translate one language batch and keep only responses that preserve the
 * source placeholders, ICU directives, markup, and expected locale keys.
 */
async function translateLanguages(row, languages, client) {
    var _a;
    try {
        const response = await client.localize(buildLocalizationRequest(row, languages));
        if (response.label !== row.label) {
            err(`Response label mismatch for "${row.label}": "${response.label}"`);
        }
        const failed = [];
        for (const code of languages) {
            const translation = (_a = response.localization[code]) === null || _a === void 0 ? void 0 : _a.text;
            const problem = validateTranslation(row.source, translation);
            if (problem) {
                err(`Rejected "${code}" for "${row.label}": ${problem}`);
                failed.push(code);
                continue;
            }
            const cell = row.cells.find((candidate) => candidate.code === code);
            if (cell) {
                cell.text = translation.trim();
            }
        }
        return failed;
    }
    catch (error) {
        err(`Failed to localize "${row.label}" [${languages.join(', ')}]: ${error}`);
        return languages;
    }
}
async function localizeRow(row, client, batchSize) {
    const codes = row.cells.map((cell) => cell.code);
    const retryAlone = [];
    for (let index = 0; index < codes.length; index += batchSize) {
        const batch = codes.slice(index, index + batchSize);
        const failed = await translateLanguages(row, batch, client);
        if (batch.length > 1) {
            retryAlone.push(...failed);
        }
    }
    for (const code of retryAlone) {
        await translateLanguages(row, [code], client);
    }
    return row.cells.some((cell) => cell.text) ? row : null;
}
/**
 * Localize rows concurrently while batching target languages per model request.
 * A failed language from a multi-language response gets one isolated retry so a
 * malformed sibling translation does not discard the entire row.
 */
export async function localizeRows(rows, client, cellsPerBatch = 3) {
    const batchSize = Math.max(1, cellsPerBatch);
    const localized = await Promise.all(rows.map((row) => localizeRow(row, client, batchSize)));
    return localized.filter((row) => row !== null);
}
//# sourceMappingURL=pipeline.js.map