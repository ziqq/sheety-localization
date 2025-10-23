import { TransProvider } from '@mbarzda/solid-i18next';
import { loadLocales } from './locales/index.js';
import { render } from 'solid-js/web';
import App from './App.jsx';
import './scss/style.scss';
import { Route, Router } from '@solidjs/router';
import routes from './routes.js';

const root = document.getElementById('root') as HTMLElement;

// function setManifest() {
//   const manifest = document.getElementById('manifest') as HTMLLinkElement;
//   if(manifest) manifest.href = `site${IS_APPLE && !IS_APPLE_MOBILE ? '_apple' : ''}.webmanifest?v=jw3mK7G9Aq`;
// }

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
