import { useTransContext } from '@mbarzda/solid-i18next';
import { createContext, createSignal, type Accessor, type ParentComponent, useContext } from 'solid-js';
import { AVAILABLE_I18N_LOCALES, I18N_LANGUAGE_NAMES, i18nService, type I18nLocale } from '../services/i18n.service';

type UseTransContextResult = ReturnType<typeof useTransContext>;
export type I18nTranslateFn = UseTransContextResult[0];

interface I18nContextType {
  locale: Accessor<I18nLocale>;
  t: I18nTranslateFn;
  availableLocales: I18nLocale[];
  languageNames: Record<I18nLocale, string>;
  changeLocale: (newLocale: I18nLocale) => boolean;
  getLanguageName: (locale: string) => string;
}

const I18nContext = createContext<I18nContextType>();

export const I18nProvider: ParentComponent = (props) => {
  const [t, { changeLanguage }] = useTransContext();
  const [locale, setLocale] = createSignal<I18nLocale>(i18nService.getLocale());

  const contextValue: I18nContextType = {
    locale,
    t,
    availableLocales: AVAILABLE_I18N_LOCALES,
    languageNames: I18N_LANGUAGE_NAMES,
    changeLocale: (newLocale) => {
      const resolvedLocale = i18nService.normalizeLocale(newLocale);
      setLocale(resolvedLocale);
      void changeLanguage(resolvedLocale);
      return true;
    },
    getLanguageName: i18nService.getLanguageName,
  };

  return <I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  return context;
};
