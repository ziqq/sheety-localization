import i18next from 'i18next';
import {
  AVAILABLE_EXAMPLE_LOCALES,
  EXAMPLE_LANGUAGE_NAMES,
  getExampleLanguageName,
  normalizeExampleLocale,
  type ExampleLocale,
} from './localization.shared';

export type I18nLocale = ExampleLocale;

export const AVAILABLE_I18N_LOCALES: I18nLocale[] = AVAILABLE_EXAMPLE_LOCALES;

export const I18N_LANGUAGE_NAMES: Record<I18nLocale, string> = EXAMPLE_LANGUAGE_NAMES;

export const i18nService = {
  normalizeLocale: normalizeExampleLocale,
  getLocale(): I18nLocale {
    return normalizeExampleLocale(i18next.language);
  },
  async changeLocale(locale: string): Promise<void> {
    await i18next.changeLanguage(normalizeExampleLocale(locale));
  },
  getLanguageName(locale: string): string {
    return getExampleLanguageName(locale);
  },
};
