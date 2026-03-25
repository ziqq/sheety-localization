import { createContext, type ParentComponent, Show, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { LoadedBucketFacadeMap, SupportedLocale } from '../locales/index.js';
import {
  AVAILABLE_L10N_LOCALES,
  L10N_LANGUAGE_NAMES,
  l10nService,
  type L10nTranslateFn,
} from '../services/l10n.service';

interface L10nContextType {
  locale: Accessor<SupportedLocale>;
  l10n: Accessor<LoadedBucketFacadeMap | undefined>;
  t: L10nTranslateFn;
  isReady: Accessor<boolean>;
  isLoading: Accessor<boolean>;
  availableLocales: SupportedLocale[];
  languageNames: Record<SupportedLocale, string>;
  changeLocale: (newLocale: SupportedLocale) => Promise<boolean>;
  resetLocale: () => Promise<boolean>;
  getLanguageName: (locale: string) => string;
}

const L10nContext = createContext<L10nContextType>();

export const L10nProvider: ParentComponent = (props) => {
  const contextValue: L10nContextType = {
    locale: l10nService.locale,
    l10n: l10nService.l10n,
    t: l10nService.t,
    isReady: l10nService.isReady,
    isLoading: l10nService.isLoading,
    availableLocales: AVAILABLE_L10N_LOCALES,
    languageNames: L10N_LANGUAGE_NAMES,
    changeLocale: l10nService.changeLocale,
    resetLocale: l10nService.resetLocale,
    getLanguageName: l10nService.getLanguageName,
  };

  return (
    <L10nContext.Provider value={contextValue}>
      <Show
        when={l10nService.isReady()}
        fallback={
          <div class="app-loading">
            <div class="loading-spinner"></div>
            <p>Loading generated localization...</p>
          </div>
        }
      >
        {props.children}
      </Show>
    </L10nContext.Provider>
  );
};

export const useL10n = (): L10nContextType => {
  const context = useContext(L10nContext);
  if (!context) {
    throw new Error('useL10n must be used within an L10nProvider');
  }
  return context;
};
