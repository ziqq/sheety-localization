import { resolveLocale, supportedLocales, type SupportedLocale } from '../locales/index.js';

export type ExampleLocale = SupportedLocale;

export const AVAILABLE_EXAMPLE_LOCALES: ExampleLocale[] = [...supportedLocales];

export const EXAMPLE_LANGUAGE_NAMES: Record<ExampleLocale, string> = {
  en: 'English',
  ru: 'Русский',
};

export function normalizeExampleLocale(locale: string): ExampleLocale {
  return resolveLocale(locale);
}

export function getExampleLanguageName(locale: string): string {
  const resolvedLocale = normalizeExampleLocale(locale);
  return EXAMPLE_LANGUAGE_NAMES[resolvedLocale] || locale.toUpperCase();
}
