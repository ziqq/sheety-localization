import { google } from 'googleapis';
import { err } from '../generator/shared.js';
/** Google Sheets failure with retry classification derived from HTTP status. */
export class SheetsError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'SheetsError';
        this.status = status;
    }
    get retryable() {
        return this.status === undefined || this.status === 429 || this.status >= 500;
    }
}
function statusOf(error) {
    if (typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'status' in error.response &&
        typeof error.response.status === 'number') {
        return error.response.status;
    }
    return undefined;
}
/** Google Sheets v4 adapter used for read-only discovery and opt-in batch writes. */
export class GoogleSheetsGateway {
    constructor(auth, spreadsheetId) {
        this.spreadsheetId = spreadsheetId;
        this.sheetsApi = google.sheets({ version: 'v4', auth });
    }
    async fetch(ignorePatterns = []) {
        var _a, _b, _c;
        try {
            const metadata = await this.sheetsApi.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });
            const sheets = [];
            for (const sheet of (_a = metadata.data.sheets) !== null && _a !== void 0 ? _a : []) {
                const title = (_b = sheet.properties) === null || _b === void 0 ? void 0 : _b.title;
                if (!title || ignorePatterns.some((pattern) => pattern.test(title))) {
                    continue;
                }
                const response = await this.sheetsApi.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: title,
                });
                if ((_c = response.data.values) === null || _c === void 0 ? void 0 : _c.length) {
                    sheets.push({ title, values: response.data.values });
                }
            }
            return sheets;
        }
        catch (error) {
            throw new SheetsError(`Failed to read spreadsheet: ${error}`, statusOf(error));
        }
    }
    async write(updates) {
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
        }
        catch (error) {
            throw new SheetsError(`Failed to write spreadsheet: ${error}`, statusOf(error));
        }
    }
}
function columnName(index) {
    let result = '';
    for (let value = index; value >= 0; value = Math.floor(value / 26) - 1) {
        result = String.fromCharCode(65 + (value % 26)) + result;
    }
    return result;
}
/** Build a quoted A1 range and escape apostrophes in the sheet title. */
export function cellRange(sheetTitle, column, row) {
    return `'${sheetTitle.replace(/'/g, "''")}'!${columnName(column)}${row + 1}`;
}
/** Convert accepted cells from one source row into a Sheets batch update. */
export function updatesForRow(sheetTitle, row) {
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
    constructor(maximum, windowMs = 60000, now = Date.now, delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))) {
        this.maximum = maximum;
        this.windowMs = windowMs;
        this.now = now;
        this.delay = delay;
        this.times = [];
        this.tail = Promise.resolve();
    }
    wait() {
        const result = this.tail.then(() => this.reserve());
        this.tail = result.catch(() => undefined);
        return result;
    }
    async reserve() {
        this.removeExpired();
        if (this.times.length >= Math.max(1, this.maximum)) {
            const waitMs = Math.max(0, this.windowMs - (this.now() - this.times[0]) + 1);
            await this.delay(waitMs);
            this.removeExpired();
        }
        this.times.push(this.now());
    }
    removeExpired() {
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
export async function writeLocalizedRow(gateway, sheetTitle, row, attempts = 3, limiter) {
    const updates = updatesForRow(sheetTitle, row);
    if (!updates.length) {
        return false;
    }
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            await (limiter === null || limiter === void 0 ? void 0 : limiter.wait());
            await gateway.write(updates);
            return true;
        }
        catch (error) {
            const retryable = !(error instanceof SheetsError) || error.retryable;
            if (!retryable || attempt === attempts) {
                err(`Failed to update "${sheetTitle}" row ${row.row + 1}: ${error}`);
                return false;
            }
            await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
        }
    }
    return false;
}
//# sourceMappingURL=sheets.js.map