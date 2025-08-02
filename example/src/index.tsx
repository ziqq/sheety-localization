import { TransProvider } from '@mbarzda/solid-i18next';
import { Router } from '@solidjs/router';
import { render } from 'solid-js/web';
import { loadLocales } from './locales/index.js';
import routes from './routes.js';
import './styles/index.scss';

const root = document.getElementById('root') as HTMLElement;

(async () => {
  const resources = await loadLocales();
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
