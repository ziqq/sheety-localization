// This file is generated, do not edit it manually!

type LocaleModule = { default: Record<string, unknown> };
type LocaleLoader = () => Promise<LocaleModule>;
type LocaleDictionary = Record<string, unknown>;

export type SupportedLocale = "en" | "ru";

export const baseLocale: SupportedLocale = "en";

export const supportedLocales: readonly SupportedLocale[] = ["en", "ru"];

export type BucketName = "app" | "errors" | "todo";

export const bucketNames: readonly BucketName[] = ["app", "errors", "todo"];

export type BucketKeyMap = {
  "app": "englishLabel" | "language" | "languageCode" | "localeCode" | "russianLabel" | "spanishLabel" | "title" | "welcomeSubtitle" | "welcomeTitle";
  "errors": "badGatewayError" | "badRequestError" | "bandwidthLimitExceededError" | "clientError" | "conflictError" | "defaultError" | "forbiddenError" | "gatewayTimeoutError" | "internalServerError" | "networkError" | "notFoundError" | "notImplementedError" | "redirectionError" | "requestTimeoutError" | "serverError" | "serviceUnavailableError" | "timeoutError" | "tooManyRequestsError" | "unauthorizedError" | "unknownError" | "validationError";
  "todo": "addButton" | "subtitle" | "title";
};

export type MessageKey<TBucket extends BucketName> = BucketKeyMap[TBucket];

export interface PlaceholderDefinition {
  type?: string;
  example?: unknown;
  [key: string]: unknown;
}

export interface MessageMeta {
  description?: string;
  placeholders?: Record<string, PlaceholderDefinition>;
  [key: string]: unknown;
}

export const bucketKeys: Record<BucketName, readonly string[]> = {
  "app": [
    "englishLabel",
    "language",
    "languageCode",
    "localeCode",
    "russianLabel",
    "spanishLabel",
    "title",
    "welcomeSubtitle",
    "welcomeTitle"
  ],
  "errors": [
    "badGatewayError",
    "badRequestError",
    "bandwidthLimitExceededError",
    "clientError",
    "conflictError",
    "defaultError",
    "forbiddenError",
    "gatewayTimeoutError",
    "internalServerError",
    "networkError",
    "notFoundError",
    "notImplementedError",
    "redirectionError",
    "requestTimeoutError",
    "serverError",
    "serviceUnavailableError",
    "timeoutError",
    "tooManyRequestsError",
    "unauthorizedError",
    "unknownError",
    "validationError"
  ],
  "todo": [
    "addButton",
    "subtitle",
    "title"
  ]
};

export const messageMeta: Record<BucketName, Partial<Record<string, MessageMeta>>> = {
  "app": {},
  "errors": {},
  "todo": {
    "subtitle": {
      "placeholders": {
        "numberOfTasks": {
          "type": "String"
        }
      }
    }
  }
};

export type BucketMessageParamsMap = {
  "app": {
    "englishLabel": undefined;
    "language": undefined;
    "languageCode": undefined;
    "localeCode": undefined;
    "russianLabel": undefined;
    "spanishLabel": undefined;
    "title": undefined;
    "welcomeSubtitle": undefined;
    "welcomeTitle": undefined;
  };
  "errors": {
    "badGatewayError": undefined;
    "badRequestError": undefined;
    "bandwidthLimitExceededError": undefined;
    "clientError": undefined;
    "conflictError": undefined;
    "defaultError": undefined;
    "forbiddenError": undefined;
    "gatewayTimeoutError": undefined;
    "internalServerError": undefined;
    "networkError": undefined;
    "notFoundError": undefined;
    "notImplementedError": undefined;
    "redirectionError": undefined;
    "requestTimeoutError": undefined;
    "serverError": undefined;
    "serviceUnavailableError": undefined;
    "timeoutError": undefined;
    "tooManyRequestsError": undefined;
    "unauthorizedError": undefined;
    "unknownError": undefined;
    "validationError": undefined;
  };
  "todo": {
    "addButton": undefined;
    "subtitle": { "numberOfTasks": string };
    "title": undefined;
  };
};

export type MessageParams<TBucket extends BucketName, TKey extends MessageKey<TBucket>> = BucketMessageParamsMap[TBucket][Extract<TKey, keyof BucketMessageParamsMap[TBucket]>];

export type LoadedBucketFacadeMap = {
  "app": {
    "englishLabel": () => string;
    "language": () => string;
    "languageCode": () => string;
    "localeCode": () => string;
    "russianLabel": () => string;
    "spanishLabel": () => string;
    "title": () => string;
    "welcomeSubtitle": () => string;
    "welcomeTitle": () => string;
  };
  "errors": {
    "badGatewayError": () => string;
    "badRequestError": () => string;
    "bandwidthLimitExceededError": () => string;
    "clientError": () => string;
    "conflictError": () => string;
    "defaultError": () => string;
    "forbiddenError": () => string;
    "gatewayTimeoutError": () => string;
    "internalServerError": () => string;
    "networkError": () => string;
    "notFoundError": () => string;
    "notImplementedError": () => string;
    "redirectionError": () => string;
    "requestTimeoutError": () => string;
    "serverError": () => string;
    "serviceUnavailableError": () => string;
    "timeoutError": () => string;
    "tooManyRequestsError": () => string;
    "unauthorizedError": () => string;
    "unknownError": () => string;
    "validationError": () => string;
  };
  "todo": {
    "addButton": () => string;
    "subtitle": (params: BucketMessageParamsMap["todo"]["subtitle"]) => string;
    "title": () => string;
  };
};

export type BucketFacadeMap = {
  "app": {
    "englishLabel": () => Promise<string>;
    "language": () => Promise<string>;
    "languageCode": () => Promise<string>;
    "localeCode": () => Promise<string>;
    "russianLabel": () => Promise<string>;
    "spanishLabel": () => Promise<string>;
    "title": () => Promise<string>;
    "welcomeSubtitle": () => Promise<string>;
    "welcomeTitle": () => Promise<string>;
  };
  "errors": {
    "badGatewayError": () => Promise<string>;
    "badRequestError": () => Promise<string>;
    "bandwidthLimitExceededError": () => Promise<string>;
    "clientError": () => Promise<string>;
    "conflictError": () => Promise<string>;
    "defaultError": () => Promise<string>;
    "forbiddenError": () => Promise<string>;
    "gatewayTimeoutError": () => Promise<string>;
    "internalServerError": () => Promise<string>;
    "networkError": () => Promise<string>;
    "notFoundError": () => Promise<string>;
    "notImplementedError": () => Promise<string>;
    "redirectionError": () => Promise<string>;
    "requestTimeoutError": () => Promise<string>;
    "serverError": () => Promise<string>;
    "serviceUnavailableError": () => Promise<string>;
    "timeoutError": () => Promise<string>;
    "tooManyRequestsError": () => Promise<string>;
    "unauthorizedError": () => Promise<string>;
    "unknownError": () => Promise<string>;
    "validationError": () => Promise<string>;
  };
  "todo": {
    "addButton": () => Promise<string>;
    "subtitle": (params: BucketMessageParamsMap["todo"]["subtitle"]) => Promise<string>;
    "title": () => Promise<string>;
  };
};

export const bucketLocales: Record<BucketName, readonly SupportedLocale[]> = {
  "app": ["en", "ru"],
  "errors": ["en", "ru"],
  "todo": ["en", "ru"],
};

const localeSet = new Set<string>(supportedLocales);
const bucketSet = new Set<string>(bucketNames);

export const locales: Record<BucketName, Partial<Record<SupportedLocale, LocaleLoader>>> = {
  "app": {
    "en": () => import("./app/app_en.json"),
    "ru": () => import("./app/app_ru.json"),
  },
  "errors": {
    "en": () => import("./errors/app_en.json"),
    "ru": () => import("./errors/app_ru.json"),
  },
  "todo": {
    "en": () => import("./todo/app_en.json"),
    "ru": () => import("./todo/app_ru.json"),
  },
};

/**
 * Normalize locale separators and trim extra whitespace.
 */
export function normalizeLocale(locale: string): string {
  return locale.replace(/-/g, '_').trim();
}

/**
 * Check whether a locale is available in the generated manifest.
 */
export function isLocale(locale: string): locale is SupportedLocale {
  return localeSet.has(normalizeLocale(locale));
}

/**
 * Check whether a bucket exists in the generated manifest.
 */
export function isBucket(bucket: string): bucket is BucketName {
  return bucketSet.has(bucket);
}

/**
 * Check whether a key exists inside a generated bucket.
 */
export function isMessageKey<TBucket extends BucketName>(bucket: TBucket, key: string): key is MessageKey<TBucket> {
  return (bucketKeys[bucket] ?? []).includes(key);
}

/**
 * Read generated metadata for a bucket message key.
 */
export function getMessageMeta<TBucket extends BucketName, TKey extends MessageKey<TBucket>>(bucket: TBucket, key: TKey): MessageMeta | undefined {
  return messageMeta[bucket][key as string];
}

/**
 * Build locale fallback chain, for example pt_BR -> pt -> base locale.
 */
export function getLocaleChain(locale: string): string[] {
  const normalized = normalizeLocale(locale);
  const chain = normalized ? [normalized] : [];
  const separatorIndex = normalized.indexOf('_');
  if (separatorIndex > 0) {
    chain.push(normalized.slice(0, separatorIndex));
  }
  if (!chain.includes(baseLocale)) {
    chain.push(baseLocale);
  }
  return chain.filter(Boolean);
}

/**
 * Resolve a locale against generated supported locales.
 */
export function resolveLocale(locale: string): SupportedLocale {
  for (const candidate of getLocaleChain(locale)) {
    if (isLocale(candidate)) {
      return candidate;
    }
  }
  return baseLocale;
}

/**
 * Resolve a locale for a specific bucket using regional fallback.
 */
export function resolveBucketLocale(bucket: BucketName, locale: string): SupportedLocale {
  const availableLocales = bucketLocales[bucket];
  for (const candidate of getLocaleChain(locale)) {
    if (availableLocales.includes(candidate as SupportedLocale)) {
      return candidate as SupportedLocale;
    }
  }
  return availableLocales[0] ?? baseLocale;
}

/**
 * Load a single generated bucket dictionary for the best matching locale.
 */
export async function loadBucket(bucket: BucketName, locale: string): Promise<LocaleDictionary> {
  const resolvedLocale = resolveBucketLocale(bucket, locale);
  const loader = locales[bucket][resolvedLocale];
  if (!loader) {
    throw new Error(`Missing locale loader for bucket '${bucket}' and locale '${resolvedLocale}'.`);
  }
  const module = await loader();
  return module.default;
}

/**
 * Replace {placeholders} in a loaded message template.
 */
export function formatMessage(template: string, params?: Record<string, unknown>): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}

/**
 * Format a message key from an already loaded bucket dictionary.
 */
export function translateLoaded<TBucket extends BucketName, TKey extends MessageKey<TBucket>>(
  bucket: TBucket,
  key: TKey,
  dictionary: LocaleDictionary,
  params?: MessageParams<TBucket, TKey>,
): string {
  const template = dictionary[key as string];
  if (typeof template !== 'string') {
    throw new Error(`Missing translation for key '${String(key)}' in bucket '${bucket}'.`);
  }
  return formatMessage(template, params as Record<string, unknown> | undefined);
}

/**
 * Create a synchronous bucket facade from an already loaded dictionary.
 */
export function createLoadedBucketFacade<TBucket extends BucketName>(bucket: TBucket, dictionary: LocaleDictionary): LoadedBucketFacadeMap[TBucket] {
  switch (bucket) {
    case "app":
      return {
        "englishLabel": () => translateLoaded("app", "englishLabel", dictionary),
        "language": () => translateLoaded("app", "language", dictionary),
        "languageCode": () => translateLoaded("app", "languageCode", dictionary),
        "localeCode": () => translateLoaded("app", "localeCode", dictionary),
        "russianLabel": () => translateLoaded("app", "russianLabel", dictionary),
        "spanishLabel": () => translateLoaded("app", "spanishLabel", dictionary),
        "title": () => translateLoaded("app", "title", dictionary),
        "welcomeSubtitle": () => translateLoaded("app", "welcomeSubtitle", dictionary),
        "welcomeTitle": () => translateLoaded("app", "welcomeTitle", dictionary),
      } as LoadedBucketFacadeMap[TBucket];
    case "errors":
      return {
        "badGatewayError": () => translateLoaded("errors", "badGatewayError", dictionary),
        "badRequestError": () => translateLoaded("errors", "badRequestError", dictionary),
        "bandwidthLimitExceededError": () => translateLoaded("errors", "bandwidthLimitExceededError", dictionary),
        "clientError": () => translateLoaded("errors", "clientError", dictionary),
        "conflictError": () => translateLoaded("errors", "conflictError", dictionary),
        "defaultError": () => translateLoaded("errors", "defaultError", dictionary),
        "forbiddenError": () => translateLoaded("errors", "forbiddenError", dictionary),
        "gatewayTimeoutError": () => translateLoaded("errors", "gatewayTimeoutError", dictionary),
        "internalServerError": () => translateLoaded("errors", "internalServerError", dictionary),
        "networkError": () => translateLoaded("errors", "networkError", dictionary),
        "notFoundError": () => translateLoaded("errors", "notFoundError", dictionary),
        "notImplementedError": () => translateLoaded("errors", "notImplementedError", dictionary),
        "redirectionError": () => translateLoaded("errors", "redirectionError", dictionary),
        "requestTimeoutError": () => translateLoaded("errors", "requestTimeoutError", dictionary),
        "serverError": () => translateLoaded("errors", "serverError", dictionary),
        "serviceUnavailableError": () => translateLoaded("errors", "serviceUnavailableError", dictionary),
        "timeoutError": () => translateLoaded("errors", "timeoutError", dictionary),
        "tooManyRequestsError": () => translateLoaded("errors", "tooManyRequestsError", dictionary),
        "unauthorizedError": () => translateLoaded("errors", "unauthorizedError", dictionary),
        "unknownError": () => translateLoaded("errors", "unknownError", dictionary),
        "validationError": () => translateLoaded("errors", "validationError", dictionary),
      } as LoadedBucketFacadeMap[TBucket];
    case "todo":
      return {
        "addButton": () => translateLoaded("todo", "addButton", dictionary),
        "subtitle": (params) => translateLoaded("todo", "subtitle", dictionary, params),
        "title": () => translateLoaded("todo", "title", dictionary),
      } as LoadedBucketFacadeMap[TBucket];
  }
  throw new Error(`Missing loaded bucket facade for bucket '${bucket}'.`);
}

/**
 * Create synchronous facades for all buckets from preloaded locale dictionaries.
 */
export function createLoadedLocaleFacade(dictionaries: Record<BucketName, LocaleDictionary>): LoadedBucketFacadeMap {
  return {
    "app": createLoadedBucketFacade("app", dictionaries["app"]),
    "errors": createLoadedBucketFacade("errors", dictionaries["errors"]),
    "todo": createLoadedBucketFacade("todo", dictionaries["todo"]),
  };
}

/**
 * Load all bucket dictionaries for a locale and expose synchronous Dart-like facades.
 */
export async function loadLocaleFacade(locale: string): Promise<LoadedBucketFacadeMap> {
  const dictionaries = await loadLocale(locale);
  return createLoadedLocaleFacade(dictionaries);
}

/**
 * Load all generated buckets for a single locale.
 */
export async function loadLocale(locale: string): Promise<Record<BucketName, LocaleDictionary>> {
  const entries = await Promise.all(
    bucketNames.map(async (bucket): Promise<[BucketName, LocaleDictionary]> => [bucket, await loadBucket(bucket, locale)])
  );
  return Object.fromEntries(entries) as Record<BucketName, LocaleDictionary>;
}

/**
 * Load a bucket and format a single message for the requested locale.
 */
export async function translate<TBucket extends BucketName, TKey extends MessageKey<TBucket>>(
  bucket: TBucket,
  key: TKey,
  locale: string,
  params?: MessageParams<TBucket, TKey>,
): Promise<string> {
  const dictionary = await loadBucket(bucket, locale);
  return translateLoaded(bucket, key, dictionary, params);
}

/**
 * Create an async bucket translator that resolves locale data on demand.
 */
export function createBucketTranslator<TBucket extends BucketName>(bucket: TBucket, locale: string) {
  return async <TKey extends MessageKey<TBucket>>(key: TKey, params?: MessageParams<TBucket, TKey>): Promise<string> =>
    translate(bucket, key, locale, params);
}

/**
 * Create an async Dart-like bucket facade that lazy-loads its dictionary once.
 */
export function createBucketFacade<TBucket extends BucketName>(bucket: TBucket, locale: string): BucketFacadeMap[TBucket] {
  const dictionaryPromise = loadBucket(bucket, locale);
  switch (bucket) {
    case "app":
      return {
        "englishLabel": async () => translateLoaded("app", "englishLabel", await dictionaryPromise),
        "language": async () => translateLoaded("app", "language", await dictionaryPromise),
        "languageCode": async () => translateLoaded("app", "languageCode", await dictionaryPromise),
        "localeCode": async () => translateLoaded("app", "localeCode", await dictionaryPromise),
        "russianLabel": async () => translateLoaded("app", "russianLabel", await dictionaryPromise),
        "spanishLabel": async () => translateLoaded("app", "spanishLabel", await dictionaryPromise),
        "title": async () => translateLoaded("app", "title", await dictionaryPromise),
        "welcomeSubtitle": async () => translateLoaded("app", "welcomeSubtitle", await dictionaryPromise),
        "welcomeTitle": async () => translateLoaded("app", "welcomeTitle", await dictionaryPromise),
      } as BucketFacadeMap[TBucket];
    case "errors":
      return {
        "badGatewayError": async () => translateLoaded("errors", "badGatewayError", await dictionaryPromise),
        "badRequestError": async () => translateLoaded("errors", "badRequestError", await dictionaryPromise),
        "bandwidthLimitExceededError": async () => translateLoaded("errors", "bandwidthLimitExceededError", await dictionaryPromise),
        "clientError": async () => translateLoaded("errors", "clientError", await dictionaryPromise),
        "conflictError": async () => translateLoaded("errors", "conflictError", await dictionaryPromise),
        "defaultError": async () => translateLoaded("errors", "defaultError", await dictionaryPromise),
        "forbiddenError": async () => translateLoaded("errors", "forbiddenError", await dictionaryPromise),
        "gatewayTimeoutError": async () => translateLoaded("errors", "gatewayTimeoutError", await dictionaryPromise),
        "internalServerError": async () => translateLoaded("errors", "internalServerError", await dictionaryPromise),
        "networkError": async () => translateLoaded("errors", "networkError", await dictionaryPromise),
        "notFoundError": async () => translateLoaded("errors", "notFoundError", await dictionaryPromise),
        "notImplementedError": async () => translateLoaded("errors", "notImplementedError", await dictionaryPromise),
        "redirectionError": async () => translateLoaded("errors", "redirectionError", await dictionaryPromise),
        "requestTimeoutError": async () => translateLoaded("errors", "requestTimeoutError", await dictionaryPromise),
        "serverError": async () => translateLoaded("errors", "serverError", await dictionaryPromise),
        "serviceUnavailableError": async () => translateLoaded("errors", "serviceUnavailableError", await dictionaryPromise),
        "timeoutError": async () => translateLoaded("errors", "timeoutError", await dictionaryPromise),
        "tooManyRequestsError": async () => translateLoaded("errors", "tooManyRequestsError", await dictionaryPromise),
        "unauthorizedError": async () => translateLoaded("errors", "unauthorizedError", await dictionaryPromise),
        "unknownError": async () => translateLoaded("errors", "unknownError", await dictionaryPromise),
        "validationError": async () => translateLoaded("errors", "validationError", await dictionaryPromise),
      } as BucketFacadeMap[TBucket];
    case "todo":
      return {
        "addButton": async () => translateLoaded("todo", "addButton", await dictionaryPromise),
        "subtitle": async (params) => translateLoaded("todo", "subtitle", await dictionaryPromise, params),
        "title": async () => translateLoaded("todo", "title", await dictionaryPromise),
      } as BucketFacadeMap[TBucket];
  }
  throw new Error(`Missing bucket facade for bucket '${bucket}'.`);
}

/**
 * Create async facades for all generated buckets for a locale.
 */
export function createLocaleFacade(locale: string): BucketFacadeMap {
  return {
    "app": createBucketFacade("app", locale),
    "errors": createBucketFacade("errors", locale),
    "todo": createBucketFacade("todo", locale),
  };
}

/**
 * Load all generated locales and all generated buckets.
 */
export async function loadLocales(): Promise<Record<SupportedLocale, Record<BucketName, LocaleDictionary>>> {
  const entries = await Promise.all(
    supportedLocales.map(async (locale): Promise<[SupportedLocale, Record<BucketName, LocaleDictionary>]> => [locale, await loadLocale(locale)])
  );
  return Object.fromEntries(entries) as Record<SupportedLocale, Record<BucketName, LocaleDictionary>>;
}