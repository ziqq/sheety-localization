import {
  compareStrings,
  isRecord,
  log,
  normalizeMessageMeta,
} from './shared.js';
import type {
  GeneratedBucketDefinition,
  GeneratedManifest,
  GeneratedMessageDefinition,
  GeneratedPlaceholderDefinition,
  LocalizationBuckets,
} from './types.js';

function extractPlaceholderDefinitions(
  meta: Record<string, unknown> | null,
): GeneratedPlaceholderDefinition[] {
  if (!meta || !isRecord(meta.placeholders)) {
    return [];
  }

  return Object.entries(meta.placeholders)
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([name, definition]) => {
      if (!isRecord(definition)) {
        return { name, type: 'unknown' };
      }

      const type =
        typeof definition.type === 'string' && definition.type.trim()
          ? definition.type.trim()
          : 'unknown';

      return {
        name,
        type,
        ...(definition.example !== undefined
          ? { example: definition.example }
          : {}),
      };
    });
}

function buildBucketDefinition(
  locales: Record<string, Record<string, unknown>>,
): GeneratedBucketDefinition {
  const schemaLocale = locales.en
    ? 'en'
    : Object.keys(locales).sort(compareStrings)[0];
  const schemaSource = (schemaLocale ? locales[schemaLocale] : {}) ?? {};
  const keys = Object.keys(schemaSource)
    .filter((key) => !key.startsWith('@'))
    .sort(compareStrings);

  return {
    keys,
    messages: keys.map((key) => {
      const meta = normalizeMessageMeta(schemaSource[`@${key}`]);
      return {
        key,
        meta,
        placeholders: extractPlaceholderDefinitions(meta),
      };
    }),
  };
}

function literalUnion(values: string[], fallback = 'string'): string {
  return values.length
    ? values.map((value) => JSON.stringify(value)).join(' | ')
    : fallback;
}

export function mapPlaceholderType(typeName: string): string {
  switch (typeName.trim().toLowerCase()) {
    case 'string':
      return 'string';
    case 'int':
    case 'integer':
    case 'double':
    case 'float':
    case 'num':
    case 'number':
      return 'number';
    case 'bool':
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'datetime':
      return 'Date | string';
    case 'array':
    case 'list':
      return 'unknown[]';
    case 'map':
    case 'json':
    case 'object':
      return 'Record<string, unknown>';
    default:
      return 'unknown';
  }
}

function createParamsType(
  placeholders: GeneratedPlaceholderDefinition[],
): string {
  if (!placeholders.length) {
    return 'undefined';
  }

  return `{ ${placeholders
    .map(
      (placeholder) =>
        `${JSON.stringify(placeholder.name)}: ${mapPlaceholderType(placeholder.type)}`,
    )
    .join('; ')} }`;
}

function createMessageMethodType(
  bucket: string,
  message: GeneratedMessageDefinition,
): string {
  const paramsType = createParamsType(message.placeholders);
  if (paramsType === 'undefined') {
    return '() => Promise<string>';
  }

  return `(params: BucketMessageParamsMap[${JSON.stringify(bucket)}][${JSON.stringify(message.key)}]) => Promise<string>`;
}

function createLoadedMessageMethodType(
  bucket: string,
  message: GeneratedMessageDefinition,
): string {
  const paramsType = createParamsType(message.placeholders);
  if (paramsType === 'undefined') {
    return '() => string';
  }

  return `(params: BucketMessageParamsMap[${JSON.stringify(bucket)}][${JSON.stringify(message.key)}]) => string`;
}

function pushDocComment(lines: string[], ...description: string[]): void {
  lines.push('/**');
  for (const line of description) {
    lines.push(` * ${line}`);
  }
  lines.push(' */');
}

export function countBucketPlaceholders(
  bucketDefinition: GeneratedBucketDefinition,
): number {
  return bucketDefinition.messages.reduce(
    (total, message) => total + message.placeholders.length,
    0,
  );
}

export function logManifestSummary(manifest: GeneratedManifest): void {
  const locales = manifest.localeNames.join(', ') || 'none';
  log(
    `Manifest summary: baseLocale=${manifest.baseLocale}, locales=[${locales}], buckets=${manifest.bucketNames.length}`,
  );

  for (const bucket of manifest.bucketNames) {
    const bucketDefinition = manifest.bucketDefinitions[bucket];
    const bucketLocalesList = manifest.bucketLocales[bucket].join(', ');
    log(
      `Bucket "${bucket}": locales=[${bucketLocalesList}], keys=${bucketDefinition.keys.length}, placeholders=${countBucketPlaceholders(bucketDefinition)}`,
    );
  }
}

function buildBucketKeysObject(
  manifest: GeneratedManifest,
): Record<string, string[]> {
  return Object.fromEntries(
    manifest.bucketNames.map((bucket) => [
      bucket,
      manifest.bucketDefinitions[bucket].keys,
    ]),
  );
}

function buildMessageMetaObject(
  manifest: GeneratedManifest,
): Record<string, Record<string, Record<string, unknown>>> {
  return Object.fromEntries(
    manifest.bucketNames.map((bucket) => [
      bucket,
      Object.fromEntries(
        manifest.bucketDefinitions[bucket].messages
          .filter((message) => message.meta)
          .map((message) => [
            message.key,
            message.meta as Record<string, unknown>,
          ]),
      ),
    ]),
  );
}

function pushJsonConst(
  lines: string[],
  declaration: string,
  value: unknown,
): void {
  const serialized = JSON.stringify(value, null, 2).split('\n');
  if (!serialized.length) {
    lines.push(`${declaration} = {};`);
    return;
  }

  lines.push(`${declaration} = ${serialized[0]}`);
  for (const line of serialized.slice(1, -1)) {
    lines.push(line);
  }
  lines.push(`${serialized[serialized.length - 1]};`);
}

export function buildGeneratedManifest(
  buckets: LocalizationBuckets,
  outputDir: string,
  prefix: string,
): GeneratedManifest {
  const bucketNames = Object.keys(buckets).sort(compareStrings);
  const bucketLocales: Record<string, string[]> = {};
  const bucketDefinitions: Record<string, GeneratedBucketDefinition> = {};
  const localeNamesSet = new Set<string>();
  const files = [];

  for (const bucket of bucketNames) {
    const localeNames = Object.keys(buckets[bucket]).sort(compareStrings);
    bucketLocales[bucket] = localeNames;
    bucketDefinitions[bucket] = buildBucketDefinition(buckets[bucket]);

    for (const locale of localeNames) {
      localeNamesSet.add(locale);
      const fileName = `${prefix ? `${prefix}_` : ''}${locale}.json`;
      files.push({
        bucket,
        locale,
        fileName,
        filePath: `${outputDir}/${bucket}/${fileName}`,
        relativeImportPath: `./${bucket}/${fileName}`,
      });
    }
  }

  const localeNames = [...localeNamesSet].sort(compareStrings);
  const baseLocale = localeNames.includes('en') ? 'en' : (localeNames[0] ?? '');

  return {
    bucketNames,
    bucketLocales,
    localeNames,
    baseLocale,
    files,
    bucketDefinitions,
  };
}

function createTypeUnion(typeName: string, values: string[]): string[] {
  return [`export type ${typeName} = ${literalUnion(values)};`];
}

export function createTsIndexSource(manifest: GeneratedManifest): string {
  const bucketKeys = buildBucketKeysObject(manifest);
  const messageMeta = buildMessageMetaObject(manifest);
  const lines: string[] = [
    '// This file is generated, do not edit it manually!',
    '',
    'type LocaleModule = { default: Record<string, unknown> };',
    'type LocaleLoader = () => Promise<LocaleModule>;',
    'type LocaleDictionary = Record<string, unknown>;',
    '',
    ...createTypeUnion('SupportedLocale', manifest.localeNames),
    '',
    `export const baseLocale: SupportedLocale = ${JSON.stringify(manifest.baseLocale)};`,
    '',
    `export const supportedLocales: readonly SupportedLocale[] = [${manifest.localeNames
      .map((locale) => JSON.stringify(locale))
      .join(', ')}];`,
    '',
    ...createTypeUnion('BucketName', manifest.bucketNames),
    '',
    `export const bucketNames: readonly BucketName[] = [${manifest.bucketNames
      .map((bucket) => JSON.stringify(bucket))
      .join(', ')}];`,
    '',
    'export type BucketKeyMap = {',
  ];

  for (const bucket of manifest.bucketNames) {
    lines.push(
      `  ${JSON.stringify(bucket)}: ${literalUnion(manifest.bucketDefinitions[bucket].keys)};`,
    );
  }

  lines.push('};', '');
  lines.push(
    'export type MessageKey<TBucket extends BucketName> = BucketKeyMap[TBucket];',
    '',
  );
  lines.push('export interface PlaceholderDefinition {');
  lines.push('  type?: string;');
  lines.push('  example?: unknown;');
  lines.push('  [key: string]: unknown;');
  lines.push('}', '');
  lines.push('export interface MessageMeta {');
  lines.push('  description?: string;');
  lines.push('  placeholders?: Record<string, PlaceholderDefinition>;');
  lines.push('  [key: string]: unknown;');
  lines.push('}', '');
  pushJsonConst(
    lines,
    'export const bucketKeys: Record<BucketName, readonly string[]>',
    bucketKeys,
  );
  lines.push('');
  pushJsonConst(
    lines,
    'export const messageMeta: Record<BucketName, Partial<Record<string, MessageMeta>>>',
    messageMeta,
  );
  lines.push('');
  lines.push('export type BucketMessageParamsMap = {');

  for (const bucket of manifest.bucketNames) {
    lines.push(`  ${JSON.stringify(bucket)}: {`);
    for (const message of manifest.bucketDefinitions[bucket].messages) {
      lines.push(
        `    ${JSON.stringify(message.key)}: ${createParamsType(message.placeholders)};`,
      );
    }
    lines.push('  };');
  }

  lines.push('};', '');
  lines.push(
    'export type MessageParams<TBucket extends BucketName, TKey extends MessageKey<TBucket>> = BucketMessageParamsMap[TBucket][Extract<TKey, keyof BucketMessageParamsMap[TBucket]>];',
    '',
    'export type LoadedBucketFacadeMap = {',
  );

  for (const bucket of manifest.bucketNames) {
    lines.push(`  ${JSON.stringify(bucket)}: {`);
    for (const message of manifest.bucketDefinitions[bucket].messages) {
      lines.push(
        `    ${JSON.stringify(message.key)}: ${createLoadedMessageMethodType(bucket, message)};`,
      );
    }
    lines.push('  };');
  }

  lines.push('};', '', 'export type BucketFacadeMap = {');

  for (const bucket of manifest.bucketNames) {
    lines.push(`  ${JSON.stringify(bucket)}: {`);
    for (const message of manifest.bucketDefinitions[bucket].messages) {
      lines.push(
        `    ${JSON.stringify(message.key)}: ${createMessageMethodType(bucket, message)};`,
      );
    }
    lines.push('  };');
  }

  lines.push(
    '};',
    '',
    'export const bucketLocales: Record<BucketName, readonly SupportedLocale[]> = {',
  );

  for (const bucket of manifest.bucketNames) {
    const locales = manifest.bucketLocales[bucket]
      .map((locale) => JSON.stringify(locale))
      .join(', ');
    lines.push(`  ${JSON.stringify(bucket)}: [${locales}],`);
  }

  lines.push('};', '');
  lines.push('const localeSet = new Set<string>(supportedLocales);');
  lines.push('const bucketSet = new Set<string>(bucketNames);', '');
  lines.push(
    'export const locales: Record<BucketName, Partial<Record<SupportedLocale, LocaleLoader>>> = {',
  );

  for (const bucket of manifest.bucketNames) {
    lines.push(`  ${JSON.stringify(bucket)}: {`);
    for (const file of manifest.files.filter(
      (entry) => entry.bucket === bucket,
    )) {
      lines.push(
        `    ${JSON.stringify(file.locale)}: () => import(${JSON.stringify(file.relativeImportPath)}),`,
      );
    }
    lines.push('  },');
  }

  lines.push('};', '');
  pushDocComment(
    lines,
    'Normalize locale separators and trim extra whitespace.',
  );
  lines.push('export function normalizeLocale(locale: string): string {');
  lines.push("  return locale.replace(/-/g, '_').trim();");
  lines.push('}', '');
  pushDocComment(
    lines,
    'Check whether a locale is available in the generated manifest.',
  );
  lines.push(
    'export function isLocale(locale: string): locale is SupportedLocale {',
  );
  lines.push('  return localeSet.has(normalizeLocale(locale));');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Check whether a bucket exists in the generated manifest.',
  );
  lines.push(
    'export function isBucket(bucket: string): bucket is BucketName {',
  );
  lines.push('  return bucketSet.has(bucket);');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Check whether a key exists inside a generated bucket.',
  );
  lines.push(
    'export function isMessageKey<TBucket extends BucketName>(bucket: TBucket, key: string): key is MessageKey<TBucket> {',
  );
  lines.push('  return (bucketKeys[bucket] ?? []).includes(key);');
  lines.push('}', '');
  pushDocComment(lines, 'Read generated metadata for a bucket message key.');
  lines.push(
    'export function getMessageMeta<TBucket extends BucketName, TKey extends MessageKey<TBucket>>(bucket: TBucket, key: TKey): MessageMeta | undefined {',
  );
  lines.push('  return messageMeta[bucket][key as string];');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Build locale fallback chain, for example pt_BR -> pt -> base locale.',
  );
  lines.push('export function getLocaleChain(locale: string): string[] {');
  lines.push('  const normalized = normalizeLocale(locale);');
  lines.push('  const chain = normalized ? [normalized] : [];');
  lines.push("  const separatorIndex = normalized.indexOf('_');");
  lines.push('  if (separatorIndex > 0) {');
  lines.push('    chain.push(normalized.slice(0, separatorIndex));');
  lines.push('  }');
  lines.push('  if (!chain.includes(baseLocale)) {');
  lines.push('    chain.push(baseLocale);');
  lines.push('  }');
  lines.push('  return chain.filter(Boolean);');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Resolve a locale against generated supported locales.',
  );
  lines.push(
    'export function resolveLocale(locale: string): SupportedLocale {',
  );
  lines.push('  for (const candidate of getLocaleChain(locale)) {');
  lines.push('    if (isLocale(candidate)) {');
  lines.push('      return candidate;');
  lines.push('    }');
  lines.push('  }');
  lines.push('  return baseLocale;');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Resolve a locale for a specific bucket using regional fallback.',
  );
  lines.push(
    'export function resolveBucketLocale(bucket: BucketName, locale: string): SupportedLocale {',
  );
  lines.push('  const availableLocales = bucketLocales[bucket];');
  lines.push('  for (const candidate of getLocaleChain(locale)) {');
  lines.push(
    '    if (availableLocales.includes(candidate as SupportedLocale)) {',
  );
  lines.push('      return candidate as SupportedLocale;');
  lines.push('    }');
  lines.push('  }');
  lines.push('  return availableLocales[0] ?? baseLocale;');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Load a single generated bucket dictionary for the best matching locale.',
  );
  lines.push(
    'export async function loadBucket(bucket: BucketName, locale: string): Promise<Record<string, unknown>> {',
  );
  lines.push('  const resolvedLocale = resolveBucketLocale(bucket, locale);');
  lines.push('  const loader = locales[bucket][resolvedLocale];');
  lines.push('  if (!loader) {');
  lines.push(
    "    throw new Error(`Missing locale loader for bucket '${bucket}' and locale '${resolvedLocale}'.`);",
  );
  lines.push('  }');
  lines.push('  const module = await loader();');
  lines.push('  return module.default;');
  lines.push('}', '');
  pushDocComment(lines, 'Replace {placeholders} in a loaded message template.');
  lines.push(
    'export function formatMessage(template: string, params?: Record<string, unknown>): string {',
  );
  lines.push('  if (!params) {');
  lines.push('    return template;');
  lines.push('  }');
  lines.push(
    '  return template.replace(/\\{(\\w+)\\}/g, (match, key) => (key in params ? String(params[key]) : match));',
  );
  lines.push('}', '');
  pushDocComment(
    lines,
    'Format a message key from an already loaded bucket dictionary.',
  );
  lines.push(
    'export function translateLoaded<TBucket extends BucketName, TKey extends MessageKey<TBucket>>(bucket: TBucket, key: TKey, dictionary: Record<string, unknown>, params?: MessageParams<TBucket, TKey>): string {',
  );
  lines.push('  const template = dictionary[key as string];');
  lines.push("  if (typeof template !== 'string') {");
  lines.push(
    "    throw new Error(`Missing translation for key '${String(key)}' in bucket '${bucket}'.`);",
  );
  lines.push('  }');
  lines.push(
    '  return formatMessage(template, params as Record<string, unknown> | undefined);',
  );
  lines.push('}', '');
  pushDocComment(
    lines,
    'Create a synchronous bucket facade from an already loaded dictionary.',
  );
  lines.push(
    'export function createLoadedBucketFacade<TBucket extends BucketName>(bucket: TBucket, dictionary: Record<string, unknown>): LoadedBucketFacadeMap[TBucket] {',
  );
  lines.push('  switch (bucket) {');

  for (const bucket of manifest.bucketNames) {
    lines.push(`    case ${JSON.stringify(bucket)}:`);
    lines.push('      return {');
    for (const message of manifest.bucketDefinitions[bucket].messages) {
      const paramsType = createParamsType(message.placeholders);
      if (paramsType === 'undefined') {
        lines.push(
          `        ${JSON.stringify(message.key)}: () => translateLoaded(${JSON.stringify(bucket)}, ${JSON.stringify(message.key)}, dictionary),`,
        );
      } else {
        lines.push(
          `        ${JSON.stringify(message.key)}: (params) => translateLoaded(${JSON.stringify(bucket)}, ${JSON.stringify(message.key)}, dictionary, params),`,
        );
      }
    }
    lines.push('      } as LoadedBucketFacadeMap[TBucket];');
  }

  lines.push('  }');
  lines.push(
    "  throw new Error(`Missing loaded bucket facade for bucket '${bucket}'.`);",
  );
  lines.push('}', '');
  pushDocComment(
    lines,
    'Create synchronous facades for all buckets from preloaded locale dictionaries.',
  );
  lines.push(
    'export function createLoadedLocaleFacade(dictionaries: Record<BucketName, Record<string, unknown>>): LoadedBucketFacadeMap {',
  );
  lines.push('  return {');
  for (const bucket of manifest.bucketNames) {
    lines.push(
      `    ${JSON.stringify(bucket)}: createLoadedBucketFacade(${JSON.stringify(bucket)}, dictionaries[${JSON.stringify(bucket)}]),`,
    );
  }
  lines.push('  };');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Load all bucket dictionaries for a locale and expose synchronous Dart-like facades.',
  );
  lines.push(
    'export async function loadLocaleFacade(locale: string): Promise<LoadedBucketFacadeMap> {',
  );
  lines.push('  const dictionaries = await loadLocale(locale);');
  lines.push('  return createLoadedLocaleFacade(dictionaries);');
  lines.push('}', '');
  pushDocComment(lines, 'Load all generated buckets for a single locale.');
  lines.push(
    'export async function loadLocale(locale: string): Promise<Record<BucketName, Record<string, unknown>>> {',
  );
  lines.push('  const entries = await Promise.all(');
  lines.push(
    '    bucketNames.map(async (bucket): Promise<[BucketName, Record<string, unknown>]> => [bucket, await loadBucket(bucket, locale)])',
  );
  lines.push('  );');
  lines.push(
    '  return Object.fromEntries(entries) as Record<BucketName, Record<string, unknown>>;',
  );
  lines.push('}', '');
  pushDocComment(
    lines,
    'Load a bucket and format a single message for the requested locale.',
  );
  lines.push(
    'export async function translate<TBucket extends BucketName, TKey extends MessageKey<TBucket>>(bucket: TBucket, key: TKey, locale: string, params?: MessageParams<TBucket, TKey>): Promise<string> {',
  );
  lines.push('  const dictionary = await loadBucket(bucket, locale);');
  lines.push('  return translateLoaded(bucket, key, dictionary, params);');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Create an async bucket translator that resolves locale data on demand.',
  );
  lines.push(
    'export function createBucketTranslator<TBucket extends BucketName>(bucket: TBucket, locale: string) {',
  );
  lines.push(
    '  return async <TKey extends MessageKey<TBucket>>(key: TKey, params?: MessageParams<TBucket, TKey>): Promise<string> => translate(bucket, key, locale, params);',
  );
  lines.push('}', '');
  pushDocComment(
    lines,
    'Create an async Dart-like bucket facade that lazy-loads its dictionary once.',
  );
  lines.push(
    'export function createBucketFacade<TBucket extends BucketName>(bucket: TBucket, locale: string): BucketFacadeMap[TBucket] {',
  );
  lines.push('  const dictionaryPromise = loadBucket(bucket, locale);');
  lines.push('  switch (bucket) {');

  for (const bucket of manifest.bucketNames) {
    lines.push(`    case ${JSON.stringify(bucket)}:`);
    lines.push('      return {');
    for (const message of manifest.bucketDefinitions[bucket].messages) {
      const paramsType = createParamsType(message.placeholders);
      if (paramsType === 'undefined') {
        lines.push(
          `        ${JSON.stringify(message.key)}: async () => translateLoaded(${JSON.stringify(bucket)}, ${JSON.stringify(message.key)}, await dictionaryPromise),`,
        );
      } else {
        lines.push(
          `        ${JSON.stringify(message.key)}: async (params) => translateLoaded(${JSON.stringify(bucket)}, ${JSON.stringify(message.key)}, await dictionaryPromise, params),`,
        );
      }
    }
    lines.push('      } as BucketFacadeMap[TBucket];');
  }

  lines.push('  }');
  lines.push(
    "  throw new Error(`Missing bucket facade for bucket '${bucket}'.`);",
  );
  lines.push('}', '');
  pushDocComment(
    lines,
    'Create async facades for all generated buckets for a locale.',
  );
  lines.push(
    'export function createLocaleFacade(locale: string): BucketFacadeMap {',
  );
  lines.push('  return {');
  for (const bucket of manifest.bucketNames) {
    lines.push(
      `    ${JSON.stringify(bucket)}: createBucketFacade(${JSON.stringify(bucket)}, locale),`,
    );
  }
  lines.push('  };');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Load all generated locales and all generated buckets.',
  );
  lines.push(
    'export async function loadLocales(): Promise<Record<SupportedLocale, Record<BucketName, Record<string, unknown>>>> {',
  );
  lines.push('  const entries = await Promise.all(');
  lines.push(
    '    supportedLocales.map(async (locale): Promise<[SupportedLocale, Record<BucketName, Record<string, unknown>>]> => [locale, await loadLocale(locale)])',
  );
  lines.push('  );');
  lines.push(
    '  return Object.fromEntries(entries) as Record<SupportedLocale, Record<BucketName, Record<string, unknown>>>;',
  );
  lines.push('}');

  return lines.join('\n');
}

export function createJsIndexSource(manifest: GeneratedManifest): string {
  const bucketKeys = buildBucketKeysObject(manifest);
  const messageMeta = buildMessageMetaObject(manifest);
  const lines: string[] = [
    '// This file is generated, do not edit it manually!',
    '',
    '/** @typedef {{ default: Record<string, unknown> }} LocaleModule */',
    '/** @typedef {() => Promise<LocaleModule>} LocaleLoader */',
    '',
    `export const baseLocale = ${JSON.stringify(manifest.baseLocale)};`,
    '',
    'export const supportedLocales = [',
    ...manifest.localeNames.map((locale) => `  ${JSON.stringify(locale)},`),
    '];',
    '',
    'export const bucketNames = [',
    ...manifest.bucketNames.map((bucket) => `  ${JSON.stringify(bucket)},`),
    '];',
    '',
    'export const bucketLocales = {',
  ];

  for (const bucket of manifest.bucketNames) {
    const locales = manifest.bucketLocales[bucket]
      .map((locale) => JSON.stringify(locale))
      .join(', ');
    lines.push(`  ${JSON.stringify(bucket)}: [${locales}],`);
  }

  lines.push('};', '');
  pushJsonConst(lines, 'export const bucketKeys', bucketKeys);
  lines.push('');
  pushJsonConst(lines, 'export const messageMeta', messageMeta);
  lines.push('');
  lines.push('const localeSet = new Set(supportedLocales);');
  lines.push('const bucketSet = new Set(bucketNames);', '');
  lines.push('/** @type {Record<string, Record<string, LocaleLoader>>} */');
  lines.push('export const locales = {');

  for (const bucket of manifest.bucketNames) {
    lines.push(`  ${JSON.stringify(bucket)}: {`);
    for (const file of manifest.files.filter(
      (entry) => entry.bucket === bucket,
    )) {
      lines.push(
        `    ${JSON.stringify(file.locale)}: () => import(${JSON.stringify(file.relativeImportPath)}),`,
      );
    }
    lines.push('  },');
  }

  lines.push('};', '');
  pushDocComment(
    lines,
    'Normalize locale separators and trim extra whitespace.',
  );
  lines.push('export function normalizeLocale(locale) {');
  lines.push("  return locale.replace(/-/g, '_').trim();");
  lines.push('}', '');
  pushDocComment(
    lines,
    'Check whether a locale is available in the generated manifest.',
  );
  lines.push('export function isLocale(locale) {');
  lines.push('  return localeSet.has(normalizeLocale(locale));');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Check whether a bucket exists in the generated manifest.',
  );
  lines.push('export function isBucket(bucket) {');
  lines.push('  return bucketSet.has(bucket);');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Check whether a key exists inside a generated bucket.',
  );
  lines.push('export function isMessageKey(bucket, key) {');
  lines.push('  return (bucketKeys[bucket] ?? []).includes(key);');
  lines.push('}', '');
  pushDocComment(lines, 'Read generated metadata for a bucket message key.');
  lines.push('export function getMessageMeta(bucket, key) {');
  lines.push('  return messageMeta[bucket]?.[key];');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Build locale fallback chain, for example pt_BR -> pt -> base locale.',
  );
  lines.push('export function getLocaleChain(locale) {');
  lines.push('  const normalized = normalizeLocale(locale);');
  lines.push('  const chain = normalized ? [normalized] : [];');
  lines.push("  const separatorIndex = normalized.indexOf('_');");
  lines.push('  if (separatorIndex > 0) {');
  lines.push('    chain.push(normalized.slice(0, separatorIndex));');
  lines.push('  }');
  lines.push('  if (!chain.includes(baseLocale)) {');
  lines.push('    chain.push(baseLocale);');
  lines.push('  }');
  lines.push('  return chain.filter(Boolean);');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Resolve a locale against generated supported locales.',
  );
  lines.push('export function resolveLocale(locale) {');
  lines.push('  for (const candidate of getLocaleChain(locale)) {');
  lines.push('    if (isLocale(candidate)) {');
  lines.push('      return candidate;');
  lines.push('    }');
  lines.push('  }');
  lines.push('  return baseLocale;');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Resolve a locale for a specific bucket using regional fallback.',
  );
  lines.push('export function resolveBucketLocale(bucket, locale) {');
  lines.push('  const availableLocales = bucketLocales[bucket] ?? [];');
  lines.push('  for (const candidate of getLocaleChain(locale)) {');
  lines.push('    if (availableLocales.includes(candidate)) {');
  lines.push('      return candidate;');
  lines.push('    }');
  lines.push('  }');
  lines.push('  return availableLocales[0] ?? baseLocale;');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Load a single generated bucket dictionary for the best matching locale.',
  );
  lines.push('export async function loadBucket(bucket, locale) {');
  lines.push('  const resolvedLocale = resolveBucketLocale(bucket, locale);');
  lines.push('  const loader = locales[bucket]?.[resolvedLocale];');
  lines.push('  if (!loader) {');
  lines.push(
    "    throw new Error(`Missing locale loader for bucket '${bucket}' and locale '${resolvedLocale}'.`);",
  );
  lines.push('  }');
  lines.push('  const module = await loader();');
  lines.push('  return module.default;');
  lines.push('}', '');
  pushDocComment(lines, 'Replace {placeholders} in a loaded message template.');
  lines.push('export function formatMessage(template, params) {');
  lines.push('  if (!params) {');
  lines.push('    return template;');
  lines.push('  }');
  lines.push(
    '  return template.replace(/\\{(\\w+)\\}/g, (match, key) => (key in params ? String(params[key]) : match));',
  );
  lines.push('}', '');
  pushDocComment(
    lines,
    'Format a message key from an already loaded bucket dictionary.',
  );
  lines.push(
    'export function translateLoaded(bucket, key, dictionary, params) {',
  );
  lines.push('  const template = dictionary[key];');
  lines.push("  if (typeof template !== 'string') {");
  lines.push(
    "    throw new Error(`Missing translation for key '${String(key)}' in bucket '${bucket}'.`);",
  );
  lines.push('  }');
  lines.push('  return formatMessage(template, params);');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Create a synchronous bucket facade from an already loaded dictionary.',
  );
  lines.push('export function createLoadedBucketFacade(bucket, dictionary) {');
  lines.push('  switch (bucket) {');

  for (const bucket of manifest.bucketNames) {
    lines.push(`    case ${JSON.stringify(bucket)}:`);
    lines.push('      return {');
    for (const message of manifest.bucketDefinitions[bucket].messages) {
      const paramsType = createParamsType(message.placeholders);
      if (paramsType === 'undefined') {
        lines.push(
          `        ${JSON.stringify(message.key)}: () => translateLoaded(${JSON.stringify(bucket)}, ${JSON.stringify(message.key)}, dictionary),`,
        );
      } else {
        lines.push(
          `        ${JSON.stringify(message.key)}: (params) => translateLoaded(${JSON.stringify(bucket)}, ${JSON.stringify(message.key)}, dictionary, params),`,
        );
      }
    }
    lines.push('      };');
  }

  lines.push('  }');
  lines.push(
    "  throw new Error(`Missing loaded bucket facade for bucket '${bucket}'.`);",
  );
  lines.push('}', '');
  pushDocComment(
    lines,
    'Create synchronous facades for all buckets from preloaded locale dictionaries.',
  );
  lines.push('export function createLoadedLocaleFacade(dictionaries) {');
  lines.push('  return {');
  for (const bucket of manifest.bucketNames) {
    lines.push(
      `    ${JSON.stringify(bucket)}: createLoadedBucketFacade(${JSON.stringify(bucket)}, dictionaries[${JSON.stringify(bucket)}]),`,
    );
  }
  lines.push('  };');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Load all bucket dictionaries for a locale and expose synchronous Dart-like facades.',
  );
  lines.push('export async function loadLocaleFacade(locale) {');
  lines.push('  const dictionaries = await loadLocale(locale);');
  lines.push('  return createLoadedLocaleFacade(dictionaries);');
  lines.push('}', '');
  pushDocComment(lines, 'Load all generated buckets for a single locale.');
  lines.push('export async function loadLocale(locale) {');
  lines.push(
    '  const entries = await Promise.all(bucketNames.map(async (bucket) => [bucket, await loadBucket(bucket, locale)]));',
  );
  lines.push('  return Object.fromEntries(entries);');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Load a bucket and format a single message for the requested locale.',
  );
  lines.push('export async function translate(bucket, key, locale, params) {');
  lines.push('  const dictionary = await loadBucket(bucket, locale);');
  lines.push('  return translateLoaded(bucket, key, dictionary, params);');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Create an async bucket translator that resolves locale data on demand.',
  );
  lines.push('export function createBucketTranslator(bucket, locale) {');
  lines.push(
    '  return (key, params) => translate(bucket, key, locale, params);',
  );
  lines.push('}', '');
  pushDocComment(
    lines,
    'Create an async Dart-like bucket facade that lazy-loads its dictionary once.',
  );
  lines.push('export function createBucketFacade(bucket, locale) {');
  lines.push('  const dictionaryPromise = loadBucket(bucket, locale);');
  lines.push('  switch (bucket) {');

  for (const bucket of manifest.bucketNames) {
    lines.push(`    case ${JSON.stringify(bucket)}:`);
    lines.push('      return {');
    for (const message of manifest.bucketDefinitions[bucket].messages) {
      const paramsType = createParamsType(message.placeholders);
      if (paramsType === 'undefined') {
        lines.push(
          `        ${JSON.stringify(message.key)}: async () => translateLoaded(${JSON.stringify(bucket)}, ${JSON.stringify(message.key)}, await dictionaryPromise),`,
        );
      } else {
        lines.push(
          `        ${JSON.stringify(message.key)}: async (params) => translateLoaded(${JSON.stringify(bucket)}, ${JSON.stringify(message.key)}, await dictionaryPromise, params),`,
        );
      }
    }
    lines.push('      };');
  }

  lines.push('  }');
  lines.push(
    "  throw new Error(`Missing bucket facade for bucket '${bucket}'.`);",
  );
  lines.push('}', '');
  pushDocComment(
    lines,
    'Create async facades for all generated buckets for a locale.',
  );
  lines.push('export function createLocaleFacade(locale) {');
  lines.push('  return {');
  for (const bucket of manifest.bucketNames) {
    lines.push(
      `    ${JSON.stringify(bucket)}: createBucketFacade(${JSON.stringify(bucket)}, locale),`,
    );
  }
  lines.push('  };');
  lines.push('}', '');
  pushDocComment(
    lines,
    'Load all generated locales and all generated buckets.',
  );
  lines.push('export async function loadLocales() {');
  lines.push(
    '  const entries = await Promise.all(supportedLocales.map(async (locale) => [locale, await loadLocale(locale)]));',
  );
  lines.push('  return Object.fromEntries(entries);');
  lines.push('}');

  return lines.join('\n');
}
