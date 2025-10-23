import { createMemo, createSignal } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { Locales } from '../i18n/i18n-types';
import enTranslations from '../i18n/en/index';
import ruTranslations from '../i18n/ru/index';

export const AVAILABLE_LOCALES: Locales[] = ['en', 'ru'];

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'Английский',
  ru: 'Русский',
};

// Helper function to convert string values to functions
function createTranslationProxy(obj: any): any {
  if (typeof obj === 'string') {
    return (params?: any) => {
      if (params && typeof params === 'object') {
        // Simple string interpolation for parameters like {name}, {count}, etc.
        return obj.replace(/\{(\w+)\}/g, (match, key) => params[key] || match);
      }
      return obj;
    };
  }

  if (typeof obj === 'object' && obj !== null) {
    const proxy: any = {};
    for (const [key, value] of Object.entries(obj)) {
      proxy[key] = createTranslationProxy(value);
    }
    return proxy;
  }

  return obj;
}

class I18nService {
  private currentLocale: () => Locales;
  private setCurrentLocale: (value: Locales) => Locales;
  private translationProxy: any;

  constructor() {
    const [locale, setLocale] = createSignal<Locales>('en');

    this.currentLocale = locale;
    this.setCurrentLocale = setLocale;
    this.translationProxy = createTranslationProxy(enTranslations);

    this.tAccessor = createMemo(() => {
      switch (this.currentLocale()) {
        case 'ru':
          return createTranslationProxy(ruTranslations);
        case 'en':
        default:
          return createTranslationProxy(enTranslations);
      }
    });

    /* this.tAccessor = createMemo(() =>
      this.currentLocale() === 'ru' ? createTranslationProxy(ruTranslations) : createTranslationProxy(enTranslations)
    ); */

    console.log('🌐 I18n Service: Initialized with English locale');
  }

  // Public getters (reactive)
  get locale() {
    return this.currentLocale;
  }

  get t() {
    return this.tAccessor;
  }

  get availableLocales() {
    return AVAILABLE_LOCALES;
  }

  get languageNames() {
    return LANGUAGE_NAMES;
  }

  // Change locale method
  changeLocale = (newLocale: Locales) => {
    console.log(`🌐 I18n Service: Locale change requested to '${newLocale}'`);
    switch (newLocale) {
      case 'en':
        this.setCurrentLocale('en');
        console.log('🌐 I18n Service: Locale changed to English');
        return true;
      case 'ru':
        this.setCurrentLocale('ru');
        console.log('🌐 I18n Service: Locale changed to Russian');
        return true;
      default:
        console.warn(`🌐 I18n Service: Unsupported locale '${newLocale}' requested`);
        return false;
    }
  };

  // Reset to default locale
  resetLocale = () => {
    console.log('🌐 I18n Service: Locale reset requested, staying on English');
    this.setCurrentLocale('en');
    this.translationProxy = createTranslationProxy(enTranslations);
    return true;
  };

  // Get language name for locale
  getLanguageName = (locale: string): string => {
    return LANGUAGE_NAMES[locale] || locale.toUpperCase();
  };

  // Check if service is ready (always ready)
  get isReady() {
    return createMemo(() => true);
  }
}

// Create singleton instance
export const i18nService = new I18nService();

console.log('🌐 I18n Service: Service created and ready');
