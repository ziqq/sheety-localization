export interface SheetValues {
  title: string;
  values: unknown[][];
}

export type LocalizationBuckets = Record<
  string,
  Record<string, Record<string, unknown>>
>;

export interface GeneratedLocaleFile {
  bucket: string;
  locale: string;
  fileName: string;
  filePath: string;
  relativeImportPath: string;
}

export interface GeneratedPlaceholderDefinition {
  name: string;
  type: string;
  example?: unknown;
}

export interface GeneratedMessageDefinition {
  key: string;
  meta: Record<string, unknown> | null;
  placeholders: GeneratedPlaceholderDefinition[];
}

export interface GeneratedBucketDefinition {
  keys: string[];
  messages: GeneratedMessageDefinition[];
}

export interface GeneratedManifest {
  bucketNames: string[];
  bucketLocales: Record<string, string[]>;
  localeNames: string[];
  baseLocale: string;
  files: GeneratedLocaleFile[];
  bucketDefinitions: Record<string, GeneratedBucketDefinition>;
}
