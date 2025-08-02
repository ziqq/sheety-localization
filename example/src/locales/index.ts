// This file is generated, do not edit it manually!

export const locales: Record<string, Record<string, () => Promise<{ default: any }>>> = {
  "app": {
    "en": () => import('./app/app_en.json'),
    "ru": () => import('./app/app_ru.json'),
  },
  "errors": {
    "en": () => import('./errors/app_en.json'),
    "ru": () => import('./errors/app_ru.json'),
  },
  "todo": {
    "en": () => import('./todo/app_en.json'),
    "ru": () => import('./todo/app_ru.json'),
  },
};

/**
 * Load all locales at once.
 * @returns Promise<Record<string, Record<string, any>>>
 */
export async function loadLocales(): Promise<Record<string, Record<string, any>>> {
  const result: Record<string, Record<string, any>> = {};
  const buckets = Object.keys(locales) as string[];
  const localeKeys = Object.keys(locales[buckets[0]]) as string[];

  for (const locale of localeKeys) {
    const entries = await Promise.all(
      buckets.map(bucket => locales[bucket][locale]().then(m => [bucket, (m as any).default] as const))
    );
    result[locale] = Object.fromEntries(entries);
  }

  return result;
}