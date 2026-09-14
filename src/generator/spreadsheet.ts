import { google } from 'googleapis';

import {
  compareStrings,
  err,
  getBaseLocale,
  isLocaleCode,
  isRecord,
  log,
  normalizeLocaleCode,
  sanitize,
} from './shared.js';
import type {
  GeneratedLocalizationTable,
  LocalizationBuckets,
  SheetValues,
} from './types.js';

function getColumnNameFromIndex(index: number): string {
  let name = '';
  while (index >= 0) {
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26) - 1;
  }

  return name;
}

/** Compile comma-separated sheet ignore expressions, skipping invalid regexes. */
export function buildIgnorePatterns(
  patternString: string | undefined,
): RegExp[] {
  if (!patternString) {
    return [];
  }

  return patternString
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .map((pattern) => {
      try {
        return new RegExp(pattern);
      } catch {
        err(`Invalid ignore pattern "${pattern}", skipping`);
        return null;
      }
    })
    .filter((regexp): regexp is RegExp => regexp !== null);
}

/**
 * Fetch sheet metadata first, then read usable tabs with bounded concurrency.
 * Results retain spreadsheet order even when value requests finish out of
 * order, which keeps generated output and logs deterministic.
 */
export async function fetchSpreadsheet(
  auth: any,
  spreadsheetId: string,
  ignorePatterns: RegExp[] = [],
): Promise<SheetValues[]> {
  const sheetsApi = google.sheets({ version: 'v4', auth });
  let metadata;
  try {
    metadata = await sheetsApi.spreadsheets.get({ spreadsheetId });
  } catch (error: any) {
    const status = error && error.response && error.response.status;
    if (status === 403) {
      err('Google Sheets API returned 403 (forbidden).');
      err(
        'Please make sure the spreadsheet is shared with the service account',
      );
      err('from your credentials.json (at least Viewer access).');
    } else if (status === 404) {
      err('Google Sheets API returned 404 (not found).');
      err('Please verify the --sheet (spreadsheetId) argument is correct.');
    } else {
      err(`Error fetching spreadsheet metadata: ${error}`);
    }
    process.exit(1);
  }

  const sheetList = metadata.data.sheets ?? [];
  const result: (SheetValues | undefined)[] = new Array(sheetList.length);
  let skippedByInsufficient = 0;
  let skippedByIgnore = 0;
  let index = 0;
  const maxConcurrent = Math.min(6, Math.max(1, sheetList.length));

  async function worker(): Promise<void> {
    while (true) {
      const currentIndex = index++;
      if (currentIndex >= sheetList.length) {
        break;
      }

      const sheet = sheetList[currentIndex];
      const title = sheet.properties?.title;
      if (!title) {
        err('Skipping sheet with missing title');
        continue;
      }

      if (ignorePatterns.some((regexp) => regexp.test(title))) {
        log(`Ignoring sheet "${title}" as it matches ignore patterns`);
        skippedByIgnore++;
        continue;
      }

      try {
        const response = await sheetsApi.spreadsheets.values.get({
          spreadsheetId,
          range: title,
        });
        const values = response.data.values;
        if (!values || values.length < 2 || values[0].length < 4) {
          err(`Sheet "${title}" has insufficient data, skipping`);
          skippedByInsufficient++;
          continue;
        }

        result[currentIndex] = { title, values };
      } catch (error) {
        err(`Error fetching values for sheet "${title}": ${error}`);
      }
    }
  }

  const workers: Promise<void>[] = [];
  for (let workerIndex = 0; workerIndex < maxConcurrent; workerIndex++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  log(
    `Spreadsheet summary: total sheets=${sheetList.length}, usable=${result.filter(Boolean).length}, ignored=${skippedByIgnore}, insufficient=${skippedByInsufficient}`,
  );
  return result.filter((sheet): sheet is SheetValues => sheet !== undefined);
}

function hasLocalizationHeader(header: unknown[]): boolean {
  const expected = ['label', 'description', 'meta'];
  return expected.every(
    (name, index) =>
      typeof header[index] === 'string' &&
      header[index].trim().toLowerCase() === name,
  );
}

/**
 * Validate localization tabs and convert rows into per-bucket dictionaries.
 * Column D is authoritative: it defines both the source locale and the schema
 * keys. Regional locale columns also feed an automatically created base-language
 * bucket so runtime fallback can merge source -> language -> region per key.
 */
export async function generateLocalizationData(
  sheets: SheetValues[],
  {
    includeEmpty = false,
  }: {
    includeEmpty?: boolean;
  } = {},
): Promise<GeneratedLocalizationTable> {
  const buckets: LocalizationBuckets = {};
  const bucketSourceLocales: Record<string, string> = {};

  for (const { title, values } of sheets) {
    const bucket = sanitize(title);
    if (!bucket) {
      err(`Sheet "${title}" has an invalid title after sanitization, skipping`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(buckets, bucket)) {
      err(`Sheet "${title}" collides with an existing bucket "${bucket}", skipping`);
      continue;
    }

    const header = values[0] as unknown[];
    if (!hasLocalizationHeader(header)) {
      err(
        `Sheet "${title}" has an invalid header; expected label | description | meta | <source> | <locale> ..., skipping`,
      );
      continue;
    }

    const sourceHeader = header[3];
    if (typeof sourceHeader !== 'string' || !isLocaleCode(sourceHeader)) {
      err(
        `Sheet "${title}" has an invalid source locale in column D, skipping`,
      );
      continue;
    }

    const sourceLocale = sanitize(normalizeLocaleCode(sourceHeader));
    buckets[bucket] = {};
    bucketSourceLocales[bucket] = sourceLocale;
    const locales: (string[] | null)[] = [];
    const existingLocales = new Set<string>();
    let addedFallbackLocales = 0;

    for (let columnIndex = 3; columnIndex < header.length; columnIndex++) {
      const localeCell = header[columnIndex];
      if (typeof localeCell === 'string' && localeCell.trim()) {
        if (!isLocaleCode(localeCell)) {
          err(
            `Invalid locale header at column ${getColumnNameFromIndex(columnIndex)}, ignoring`,
          );
          locales[columnIndex] = null;
          continue;
        }

        const locale = sanitize(normalizeLocaleCode(localeCell));
        if (existingLocales.has(locale)) {
          err(
            `Duplicate locale "${locale}" at column ${getColumnNameFromIndex(columnIndex)}, ignoring`,
          );
          locales[columnIndex] = null;
          continue;
        }

        buckets[bucket][locale] = {};
        locales[columnIndex] = [locale];
        existingLocales.add(locale);
      } else {
        err(
          `Invalid locale header at column ${getColumnNameFromIndex(columnIndex)}, ignoring`,
        );
        locales[columnIndex] = null;
      }
    }

    for (let columnIndex = 3; columnIndex < header.length; columnIndex++) {
      const localeTargets = locales[columnIndex];
      const locale = localeTargets?.[0];
      if (!locale) {
        continue;
      }

      const baseLocale = getBaseLocale(locale);
      if (!baseLocale || existingLocales.has(baseLocale)) {
        continue;
      }

      buckets[bucket][baseLocale] = {};
      existingLocales.add(baseLocale);
      localeTargets.push(baseLocale);
      addedFallbackLocales++;
      log(
        `Sheet "${title}" has missing base locale "${baseLocale}", adding fallback bucket`,
      );
    }

    let skippedEmptyRows = 0;
    let skippedEmptyLabels = 0;
    let skippedDuplicateLabels = 0;
    let skippedMissingSource = 0;
    let processedRows = 0;
    const existingKeys = new Set<string>();

    for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
      const row = (values[rowIndex] as unknown[]) || [];
      if (
        row.length === 0 ||
        row.every((cell) => cell == null || String(cell).trim() === '')
      ) {
        err(`Sheet "${title}" has empty row ${rowIndex + 1}, skipping`);
        skippedEmptyRows++;
        continue;
      }

      if (row.length < 3) {
        err(
          `Sheet "${title}" has row ${rowIndex + 1} with less than 3 base columns, skipping`,
        );
        skippedEmptyRows++;
        continue;
      }

      const label = row[0];
      if (typeof label !== 'string' || !label.trim()) {
        err(`Empty label at row ${rowIndex + 1}, skipping`);
        skippedEmptyLabels++;
        continue;
      }

      const key = sanitize(label);
      if (!key) {
        err(`Invalid label at row ${rowIndex + 1}, skipping`);
        skippedEmptyLabels++;
        continue;
      }
      if (existingKeys.has(key)) {
        err(`Duplicate label "${key}" at row ${rowIndex + 1}, skipping`);
        skippedDuplicateLabels++;
        continue;
      }

      const sourceValue = row[3];
      if (sourceValue == null || String(sourceValue).trim() === '') {
        err(
          `Missing source locale value at row ${rowIndex + 1}, skipping`,
        );
        skippedMissingSource++;
        continue;
      }
      existingKeys.add(key);

      const descriptionRaw = row[1];
      const description =
        typeof descriptionRaw === 'string' && descriptionRaw.trim()
          ? descriptionRaw.trim()
          : null;
      const metaRaw = row[2] ?? '';
      const metaObject: Record<string, unknown> = {
        ...(description ? { description } : {}),
      };
      if (typeof metaRaw === 'string') {
        const trimmed = metaRaw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const parsed = JSON.parse(trimmed) as unknown;
            if (isRecord(parsed)) {
              Object.assign(metaObject, parsed);
            } else {
              err(`Invalid JSON object in meta at row ${rowIndex + 1}`);
            }
          } catch {
            err(`Invalid JSON in meta at row ${rowIndex + 1}`);
          }
        } else if (trimmed.length > 0) {
          err(`Non-JSON meta at row ${rowIndex + 1}, ignoring`);
        }
      } else if (isRecord(metaRaw)) {
        Object.assign(metaObject, metaRaw);
      }

      for (let columnIndex = 3; columnIndex < header.length; columnIndex++) {
        const localeTargets = locales[columnIndex];
        if (!localeTargets) {
          continue;
        }

        const cell = row.length > columnIndex ? row[columnIndex] : undefined;
        const isMissingTranslation =
          cell == null || (typeof cell === 'string' && cell.trim() === '');
        if (isMissingTranslation && !includeEmpty) {
          continue;
        }

        const text = cell != null ? String(cell) : '';
        for (const locale of localeTargets) {
          buckets[bucket][locale][key] = text;
          if (Object.keys(metaObject).length) {
            buckets[bucket][locale][`@${key}`] = metaObject;
          }
        }
      }

      processedRows++;
    }

    log(
      `Sheet "${title}" summary: sourceLocale=${sourceLocale}, locales=[${[...existingLocales].sort(compareStrings).join(', ')}], addedFallbackLocales=${addedFallbackLocales}, processed=${processedRows}, skippedEmptyRows=${skippedEmptyRows}, skippedEmptyLabels=${skippedEmptyLabels}, skippedDuplicateLabels=${skippedDuplicateLabels}, skippedMissingSource=${skippedMissingSource}`,
    );
  }

  return { buckets, bucketSourceLocales };
}

/**
 * Compatibility wrapper for callers that only need generated dictionaries and
 * do not consume per-bucket source locale metadata.
 */
export async function generateLocalizationTable(
  sheets: SheetValues[],
  options: { includeEmpty?: boolean } = {},
): Promise<LocalizationBuckets> {
  return (await generateLocalizationData(sheets, options)).buckets;
}
