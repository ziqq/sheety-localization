import { google } from 'googleapis';

import { compareStrings, err, getBaseLocale, log, sanitize } from './shared.js';
import type { LocalizationBuckets, SheetValues } from './types.js';

function getColumnNameFromIndex(index: number): string {
  let name = '';
  while (index >= 0) {
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26) - 1;
  }

  return name;
}

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
  const result: SheetValues[] = [];
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

        result.push({ title, values });
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
    `Spreadsheet summary: total sheets=${sheetList.length}, usable=${result.length}, ignored=${skippedByIgnore}, insufficient=${skippedByInsufficient}`,
  );
  return result;
}

export async function generateLocalizationTable(
  sheets: SheetValues[],
  {
    includeEmpty = false,
  }: {
    includeEmpty?: boolean;
  } = {},
): Promise<LocalizationBuckets> {
  const buckets: LocalizationBuckets = {};

  for (const { title, values } of sheets) {
    const bucket = sanitize(title);
    buckets[bucket] = {};
    const header = values[0] as unknown[];
    const locales: (string[] | null)[] = [];
    const existingLocales = new Set<string>();
    let addedFallbackLocales = 0;

    for (let columnIndex = 3; columnIndex < header.length; columnIndex++) {
      const localeCell = header[columnIndex];
      if (typeof localeCell === 'string' && localeCell.trim()) {
        const locale = sanitize(localeCell);
        if (!locale) {
          err(
            `Invalid locale header at column ${getColumnNameFromIndex(columnIndex)}, ignoring`,
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
    let processedRows = 0;

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
      const metaRaw = row[2] ?? '';
      let metaObject: Record<string, unknown> | null = null;
      let metaText: string | null = null;
      if (typeof metaRaw === 'string') {
        const trimmed = metaRaw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            metaObject = JSON.parse(trimmed) as Record<string, unknown>;
          } catch {
            err(`Invalid JSON in meta at row ${rowIndex + 1}`);
          }
        } else if (trimmed.length > 0) {
          metaText = trimmed;
        }
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
          if (metaObject && Object.keys(metaObject).length) {
            buckets[bucket][locale][`@${key}`] = metaObject;
          } else if (metaText) {
            buckets[bucket][locale][`@${key}`] = metaText;
          }
        }
      }

      processedRows++;
    }

    log(
      `Sheet "${title}" summary: locales=[${[...existingLocales].sort(compareStrings).join(', ')}], addedFallbackLocales=${addedFallbackLocales}, processed=${processedRows}, skippedEmptyRows=${skippedEmptyRows}, skippedEmptyLabels=${skippedEmptyLabels}`,
    );
  }

  return buckets;
}
