// This file is generated, do not edit it manually!

/** @typedef {{ default: Record<string, unknown> }} LocaleModule */
/** @typedef {() => Promise<LocaleModule>} LocaleLoader */

export const baseLocale = "en";

export const supportedLocales = [
  "en",
  "ru",
];

export const bucketNames = [
  "app",
  "errors",
  "todo",
];

export const bucketLocales = {
  "app": ["en", "ru"],
  "errors": ["en", "ru"],
  "todo": ["en", "ru"],
};

export const bucketKeys = {
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

export const messageMeta = {
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

const localeSet = new Set(supportedLocales);
const bucketSet = new Set(bucketNames);

/** @type {Record<string, Record<string, LocaleLoader>>} */
export const locales = {
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
export function normalizeLocale(locale) {
  return locale.replace(/-/g, '_').trim();
}

/**
 * Check whether a locale is available in the generated manifest.
 */
export function isLocale(locale) {
  return localeSet.has(normalizeLocale(locale));
}

/**
 * Check whether a bucket exists in the generated manifest.
 */
export function isBucket(bucket) {
  return bucketSet.has(bucket);
}

/**
 * Check whether a key exists inside a generated bucket.
 */
export function isMessageKey(bucket, key) {
  return (bucketKeys[bucket] ?? []).includes(key);
}

/**
 * Read generated metadata for a bucket message key.
 */
export function getMessageMeta(bucket, key) {
  return messageMeta[bucket]?.[key];
}

/**
 * Build locale fallback chain, for example pt_BR -> pt -> base locale.
 */
export function getLocaleChain(locale) {
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
export function resolveLocale(locale) {
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
export function resolveBucketLocale(bucket, locale) {
  const availableLocales = bucketLocales[bucket] ?? [];
  for (const candidate of getLocaleChain(locale)) {
    if (availableLocales.includes(candidate)) {
      return candidate;
    }
  }
  return availableLocales[0] ?? baseLocale;
}

/**
 * Load a single generated bucket dictionary for the best matching locale.
 */
export async function loadBucket(bucket, locale) {
  const resolvedLocale = resolveBucketLocale(bucket, locale);
  const loader = locales[bucket]?.[resolvedLocale];
  if (!loader) {
    throw new Error(`Missing locale loader for bucket '${bucket}' and locale '${resolvedLocale}'.`);
  }
  const module = await loader();
  return module.default;
}

/**
 * Replace {placeholders} in a loaded message template.
 */
export function formatMessage(template, params) {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}

/**
 * Format a message key from an already loaded bucket dictionary.
 */
export function translateLoaded(bucket, key, dictionary, params) {
  const template = dictionary[key];
  if (typeof template !== 'string') {
    throw new Error(`Missing translation for key '${String(key)}' in bucket '${bucket}'.`);
  }
  return formatMessage(template, params);
}

/**
 * Create a synchronous bucket facade from an already loaded dictionary.
 */
export function createLoadedBucketFacade(bucket, dictionary) {
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
      };
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
      };
    case "todo":
      return {
        "addButton": () => translateLoaded("todo", "addButton", dictionary),
        "subtitle": (params) => translateLoaded("todo", "subtitle", dictionary, params),
        "title": () => translateLoaded("todo", "title", dictionary),
      };
  }
  throw new Error(`Missing loaded bucket facade for bucket '${bucket}'.`);
}

/**
 * Create synchronous facades for all buckets from preloaded locale dictionaries.
 */
export function createLoadedLocaleFacade(dictionaries) {
  return {
    "app": createLoadedBucketFacade("app", dictionaries["app"]),
    "errors": createLoadedBucketFacade("errors", dictionaries["errors"]),
    "todo": createLoadedBucketFacade("todo", dictionaries["todo"]),
  };
}

/**
 * Load all bucket dictionaries for a locale and expose synchronous Dart-like facades.
 */
export async function loadLocaleFacade(locale) {
  const dictionaries = await loadLocale(locale);
  return createLoadedLocaleFacade(dictionaries);
}

/**
 * Load all generated buckets for a single locale.
 */
export async function loadLocale(locale) {
  const entries = await Promise.all(bucketNames.map(async (bucket) => [bucket, await loadBucket(bucket, locale)]));
  return Object.fromEntries(entries);
}

/**
 * Load a bucket and format a single message for the requested locale.
 */
export async function translate(bucket, key, locale, params) {
  const dictionary = await loadBucket(bucket, locale);
  return translateLoaded(bucket, key, dictionary, params);
}

/**
 * Create an async bucket translator that resolves locale data on demand.
 */
export function createBucketTranslator(bucket, locale) {
  return (key, params) => translate(bucket, key, locale, params);
}

/**
 * Create an async Dart-like bucket facade that lazy-loads its dictionary once.
 */
export function createBucketFacade(bucket, locale) {
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
      };
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
      };
    case "todo":
      return {
        "addButton": async () => translateLoaded("todo", "addButton", await dictionaryPromise),
        "subtitle": async (params) => translateLoaded("todo", "subtitle", await dictionaryPromise, params),
        "title": async () => translateLoaded("todo", "title", await dictionaryPromise),
      };
  }
  throw new Error(`Missing bucket facade for bucket '${bucket}'.`);
}

/**
 * Create async facades for all generated buckets for a locale.
 */
export function createLocaleFacade(locale) {
  return {
    "app": createBucketFacade("app", locale),
    "errors": createBucketFacade("errors", locale),
    "todo": createBucketFacade("todo", locale),
  };
}

/**
 * Load all generated locales and all generated buckets.
 */
export async function loadLocales() {
  const entries = await Promise.all(supportedLocales.map(async (locale) => [locale, await loadLocale(locale)]));
  return Object.fromEntries(entries);
}