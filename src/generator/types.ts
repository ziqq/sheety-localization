/** Raw values read from one named Google Sheets tab. */
export interface SheetValues {
  title: string;
  values: unknown[][];
}

/** Bucket -> locale -> generated JSON dictionary. */
export type LocalizationBuckets = Record<
  string,
  Record<string, Record<string, unknown>>
>;

/** Parsed dictionaries together with each bucket's authoritative source locale. */
export interface GeneratedLocalizationTable {
  buckets: LocalizationBuckets;
  bucketSourceLocales: Record<string, string>;
}

/** One locale file and the paths needed by output and generated imports. */
export interface GeneratedLocaleFile {
  bucket: string;
  locale: string;
  fileName: string;
  filePath: string;
  relativeImportPath: string;
}

/** Placeholder metadata used to derive generated method parameter types. */
export interface GeneratedPlaceholderDefinition {
  name: string;
  type: string;
  example?: unknown;
}

/** Runtime schema for one source-locale message key. */
export interface GeneratedMessageDefinition {
  key: string;
  meta: Record<string, unknown> | null;
  placeholders: GeneratedPlaceholderDefinition[];
}

/** Stable message inventory and metadata for one generated bucket. */
export interface GeneratedBucketDefinition {
  keys: string[];
  messages: GeneratedMessageDefinition[];
}

/** Complete data contract rendered into generated JavaScript or TypeScript. */
export interface GeneratedManifest {
  bucketNames: string[];
  bucketLocales: Record<string, string[]>;
  bucketBaseLocales: Record<string, string>;
  localeNames: string[];
  baseLocale: string;
  files: GeneratedLocaleFile[];
  bucketDefinitions: Record<string, GeneratedBucketDefinition>;
}
