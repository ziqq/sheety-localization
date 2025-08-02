import { TransProvider } from '@mbarzda/solid-i18next';
import { Router } from '@solidjs/router';
import { render } from 'solid-js/web';
import locales from './locales/index.js';
import routes from './routes.js';
import './styles/index.scss';

const root = document.getElementById('root') as HTMLElement;

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
        children={<Router>{routes}</Router>}
      />
    ),
    root
  );
})();
