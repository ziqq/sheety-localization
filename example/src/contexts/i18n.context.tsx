import { createContext, ParentComponent, Show, useContext } from 'solid-js';
import type { Locales } from '../i18n/i18n-types';
import { AVAILABLE_LOCALES, i18nService, LANGUAGE_NAMES } from '../services/i18n.service';

interface I18nContextType {
  // Reactive getters
  locale: () => Locales;
  t: () => any; // Используем any чтобы избежать проблем с типами
  isReady: () => boolean;

  // Static data
  availableLocales: Locales[];
  languageNames: Record<string, string>;

  // Methods
  changeLocale: (newLocale: Locales) => boolean;
  resetLocale: () => boolean;
  getLanguageName: (locale: string) => string;
}

const I18nContext = createContext<I18nContextType>();

export const I18nProvider: ParentComponent = (props) => {
  const contextValue: I18nContextType = {
    // Reactive getters from service
    locale: i18nService.locale,
    t: i18nService.t,
    isReady: i18nService.isReady,

    // Static data
    availableLocales: AVAILABLE_LOCALES,
    languageNames: LANGUAGE_NAMES,

    // Methods
    changeLocale: i18nService.changeLocale,
    resetLocale: i18nService.resetLocale,
    getLanguageName: i18nService.getLanguageName,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      <Show
        when={i18nService.isReady()}
        fallback={
          <div class="app-loading">
            <div class="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        }
      >
        {props.children}
      </Show>
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Convenience hooks
export const useLocale = () => {
  const { locale } = useI18n();
  return locale;
};

export const useTranslations = () => {
  const { t } = useI18n();
  return t;
};

export const useChangeLocale = () => {
  const { changeLocale } = useI18n();
  return changeLocale;
};

// Legacy compatibility
export const useTranslation = useTranslations;
