import { google } from 'googleapis';

import { err } from '../generator/shared.js';
import type { SheetValues } from '../generator/types.js';
import type {
  LocalizeRow,
  SheetsGateway,
  SheetUpdate,
} from '../localize/models.js';

/** Google Sheets failure with retry classification derived from HTTP status. */
export class SheetsError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SheetsError';
    this.status = status;
  }

  get retryable(): boolean {
    return this.status === undefined || this.status === 429 || this.status >= 500;
  }
}

function statusOf(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    return error.response.status;
  }
  return undefined;
}

/** Google Sheets v4 adapter used for read-only discovery and opt-in batch writes. */
export class GoogleSheetsGateway implements SheetsGateway {
  private readonly sheetsApi;

  constructor(
    auth: any,
    private readonly spreadsheetId: string,
  ) {
    this.sheetsApi = google.sheets({ version: 'v4', auth });
  }

  async fetch(ignorePatterns: RegExp[] = []): Promise<SheetValues[]> {
    try {
      const metadata = await this.sheetsApi.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const sheets: SheetValues[] = [];
      for (const sheet of metadata.data.sheets ?? []) {
        const title = sheet.properties?.title;
        if (!title || ignorePatterns.some((pattern) => pattern.test(title))) {
          continue;
        }
        const response = await this.sheetsApi.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: title,
        });
        if (response.data.values?.length) {
          sheets.push({ title, values: response.data.values });
        }
      }
      return sheets;
    } catch (error) {
      throw new SheetsError(
        `Failed to read spreadsheet: ${error}`,
        statusOf(error),
      );
    }
  }

  async write(updates: SheetUpdate[]): Promise<void> {
    try {
      await this.sheetsApi.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates.map((update) => ({
            range: update.range,
            values: [[update.value]],
          })),
        },
      });
    } catch (error) {
      throw new SheetsError(
        `Failed to write spreadsheet: ${error}`,
        statusOf(error),
      );
    }
  }
}

function columnName(index: number): string {
  let result = '';
  for (let value = index; value >= 0; value = Math.floor(value / 26) - 1) {
    result = String.fromCharCode(65 + (value % 26)) + result;
  }
  return result;
}

/** Build a quoted A1 range and escape apostrophes in the sheet title. */
export function cellRange(
  sheetTitle: string,
  column: number,
  row: number,
): string {
  return `'${sheetTitle.replace(/'/g, "''")}'!${columnName(column)}${row + 1}`;
}

/** Convert accepted cells from one source row into a Sheets batch update. */
export function updatesForRow(
  sheetTitle: string,
  row: LocalizeRow,
): SheetUpdate[] {
  return row.cells
    .filter((cell) => cell.text)
    .map((cell) => ({
      range: cellRange(sheetTitle, cell.column, row.row),
      value: cell.text,
    }));
}

/**
 * Serialize reservations within a rolling time window. This protects write mode
 * from exceeding Sheets quota even when localized rows complete concurrently.
 */
export class RateLimiter {
  private readonly times: number[] = [];
  private tail = Promise.resolve();

  constructor(
    private readonly maximum: number,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now,
    private readonly delay: (milliseconds: number) => Promise<void> =
      (milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ) {}

  wait(): Promise<void> {
    const result = this.tail.then(() => this.reserve());
    this.tail = result.catch(() => undefined);
    return result;
  }

  private async reserve(): Promise<void> {
    this.removeExpired();
    if (this.times.length >= Math.max(1, this.maximum)) {
      const waitMs = Math.max(0, this.windowMs - (this.now() - this.times[0]) + 1);
      await this.delay(waitMs);
      this.removeExpired();
    }
    this.times.push(this.now());
  }

  private removeExpired(): void {
    const cutoff = this.now() - this.windowMs;
    while (this.times.length && this.times[0] <= cutoff) {
      this.times.shift();
    }
  }
}

/**
 * Write all accepted translations for one row atomically, retrying only
 * transient Sheets failures and respecting the optional global rate limiter.
 */
export async function writeLocalizedRow(
  gateway: SheetsGateway,
  sheetTitle: string,
  row: LocalizeRow,
  attempts = 3,
  limiter?: RateLimiter,
): Promise<boolean> {
  const updates = updatesForRow(sheetTitle, row);
  if (!updates.length) {
    return false;
  }
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await limiter?.wait();
      await gateway.write(updates);
      return true;
    } catch (error) {
      const retryable = !(error instanceof SheetsError) || error.retryable;
      if (!retryable || attempt === attempts) {
        err(`Failed to update "${sheetTitle}" row ${row.row + 1}: ${error}`);
        return false;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * 2 ** (attempt - 1)),
      );
    }
  }
  return false;
}
