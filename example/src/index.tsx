import { TransProvider } from '@mbarzda/solid-i18next';
import { loadLocales } from './locales/index.js';
import { render } from 'solid-js/web';
import App from './App.jsx';
import './styles/index.scss';
import { Route, Router } from '@solidjs/router';
import routes from './routes.js';

const root = document.getElementById('root') as HTMLElement;

(async () => {
  const resources = await loadLocales();
  render(
    () => (
      <TransProvider
        lng="en"
        options={{
          resources,
          debug: true,
          lng: 'en',
          fallbackLng: 'en',
          ns: ['app', 'errors', 'todo'],
          defaultNS: 'app',
          // keySeparator: '.',
          // nsSeparator: '.', // ← теперь точка делит namespace и key
          interpolation: {
            escapeValue: false,
            prefix: '{',
            suffix: '}',
          },
        }}
      >
        <Router root={App}>{routes}</Router>
      </TransProvider>
    ),
    root
  );
})();
