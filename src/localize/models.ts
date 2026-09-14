import type { SheetValues } from '../generator/types.js';

/** Empty target cell selected for translation. */
export interface LocalizeCell {
  column: number;
  code: string;
  text: string;
}

/** One source row plus only the empty target cells eligible for localization. */
export interface LocalizeRow {
  row: number;
  label: string;
  description?: string;
  meta?: string;
  sourceCode: string;
  source: string;
  cells: LocalizeCell[];
}

/** Strict structured payload returned by the localization provider. */
export interface LocalizationResponse {
  label: string;
  localization: Record<string, { text: string }>;
}

/** Provider-neutral prompt and JSON Schema passed to a localization client. */
export interface LocalizationRequest {
  prompt: string;
  schema: Record<string, unknown>;
}

/** Injectable translation boundary used by the pipeline and tests. */
export interface LocalizationClient {
  localize(request: LocalizationRequest): Promise<LocalizationResponse>;
}

/** One RAW Google Sheets cell update expressed as an A1 range. */
export interface SheetUpdate {
  range: string;
  value: string;
}

/** Read/write boundary for Google Sheets integrations. */
export interface SheetsGateway {
  fetch(ignorePatterns?: RegExp[]): Promise<SheetValues[]>;
  write(updates: SheetUpdate[]): Promise<void>;
}
