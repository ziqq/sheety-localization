import { TransProvider, useTransContext } from '@mbarzda/solid-i18next';
import { render } from 'solid-js/web';
import i18next from 'i18next';
import App from './App';
import './styles/index.scss';

import locales from './locales/index.js';

// Load locales dynamically
async function loadResources() {
  return {
    en: {
      app: (await locales.app.en()).default,
      errors: (await locales.errors.en()).default,
    },
    ru: {
      app: (await locales.app.ru()).default,
      errors: (await locales.errors.ru()).default,
    },
  };
}

(async () => {
  const resources = await loadResources();

  render(
    () => (
      <TransProvider
        lng="en"
        options={{
          resources,
          lng: 'en', // язык по умолчанию
          ns: ['app', 'errors'],
          defaultNS: 'app',
          debug: true,
          fallbackLng: false,
        }}
        children={<App />}
      />
    ),
    document.getElementById('root') as HTMLElement
  );
})();
