import { createMemo, createSignal } from 'solid-js';
import type { Accessor } from 'solid-js';
import {
  baseLocale,
  createLoadedLocaleFacade,
  loadLocale,
  translateLoaded,
  type BucketName,
  type LoadedBucketFacadeMap,
  type MessageKey,
  type MessageParams,
  type SupportedLocale,
} from '../locales/index.js';
import {
  AVAILABLE_EXAMPLE_LOCALES,
  EXAMPLE_LANGUAGE_NAMES,
  getExampleLanguageName,
  normalizeExampleLocale,
} from './localization.shared';

type LocaleDictionaries = Awaited<ReturnType<typeof loadLocale>>;

export type L10nTranslateFn = <TBucket extends BucketName, TKey extends MessageKey<TBucket>>(
  bucket: TBucket,
  key: TKey,
  params?: MessageParams<TBucket, TKey>
) => string;

const STORAGE_KEY = 'sheety-localization-example-locale';

export const AVAILABLE_L10N_LOCALES: SupportedLocale[] = AVAILABLE_EXAMPLE_LOCALES;

export const L10N_LANGUAGE_NAMES: Record<SupportedLocale, string> = EXAMPLE_LANGUAGE_NAMES;

function getInitialL10nLocale(): SupportedLocale {
  if (typeof window === 'undefined') {
    return baseLocale;
  }

  const persistedLocale = window.localStorage.getItem(STORAGE_KEY);
  if (persistedLocale) {
    return normalizeExampleLocale(persistedLocale);
  }

  return normalizeExampleLocale(window.navigator.language || baseLocale);
}

class L10nService {
  private readonly currentLocaleAccessor: Accessor<SupportedLocale>;
  private readonly setCurrentLocaleAccessor: (value: SupportedLocale) => SupportedLocale;
  private readonly currentDictionariesAccessor: Accessor<LocaleDictionaries | null>;
  private readonly setCurrentDictionariesAccessor: (value: LocaleDictionaries | null) => LocaleDictionaries | null;
  private readonly setLoadingAccessor: (value: boolean) => boolean;
  private requestId = 0;

  readonly locale: Accessor<SupportedLocale>;
  readonly l10n: Accessor<LoadedBucketFacadeMap | undefined>;
  readonly isReady: Accessor<boolean>;
  readonly isLoading: Accessor<boolean>;
  readonly t: L10nTranslateFn;

  constructor() {
    const initialLocale = getInitialL10nLocale();
    const [locale, setLocale] = createSignal<SupportedLocale>(initialLocale);
    const [dictionaries, setDictionaries] = createSignal<LocaleDictionaries | null>(null);
    const [isLoading, setIsLoading] = createSignal(true);

    this.currentLocaleAccessor = locale;
    this.setCurrentLocaleAccessor = setLocale;
    this.currentDictionariesAccessor = dictionaries;
    this.setCurrentDictionariesAccessor = setDictionaries;
    this.setLoadingAccessor = setIsLoading;

    this.locale = locale;
    this.isLoading = isLoading;
    this.isReady = createMemo(() => this.currentDictionariesAccessor() !== null);
    this.l10n = createMemo(() => {
      const loadedDictionaries = this.currentDictionariesAccessor();
      return loadedDictionaries ? createLoadedLocaleFacade(loadedDictionaries) : undefined;
    });
    this.t = (bucket, key, params) => {
      const loadedDictionaries = this.currentDictionariesAccessor();
      if (!loadedDictionaries) {
        return '';
      }

      return translateLoaded(bucket, key, loadedDictionaries[bucket], params);
    };

    void this.loadGeneratedLocale(initialLocale);
  }

  changeLocale = async (newLocale: SupportedLocale): Promise<boolean> => {
    return this.loadGeneratedLocale(newLocale);
  };

  resetLocale = async (): Promise<boolean> => {
    return this.loadGeneratedLocale(baseLocale);
  };

  getLanguageName = (locale: string): string => {
    return getExampleLanguageName(locale);
  };

  private async loadGeneratedLocale(locale: string): Promise<boolean> {
    const resolvedLocale = normalizeExampleLocale(locale);
    const currentRequestId = ++this.requestId;

    this.setLoadingAccessor(true);

    try {
      const dictionaries = await loadLocale(resolvedLocale);
      if (currentRequestId !== this.requestId) {
        return false;
      }

      this.setCurrentDictionariesAccessor(dictionaries);
      this.setCurrentLocaleAccessor(resolvedLocale);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, resolvedLocale);
      }

      return true;
    } catch (error) {
      if (currentRequestId === this.requestId) {
        this.setCurrentDictionariesAccessor(null);
      }
      console.error('Failed to load generated localization', error);
      return false;
    } finally {
      if (currentRequestId === this.requestId) {
        this.setLoadingAccessor(false);
      }
    }
  }
}

export const l10nService = new L10nService();
