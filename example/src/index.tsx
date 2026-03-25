import { TransProvider } from '@mbarzda/solid-i18next';
import { baseLocale, bucketNames, loadLocales, supportedLocales } from './locales/index.js';
import { render } from 'solid-js/web';
import App from './App.jsx';
import './scss/style.scss';
import { Router } from '@solidjs/router';
import routes from './routes.js';

const root = document.getElementById('root') as HTMLElement;

(async () => {
	const resources = await loadLocales();

	render(
		() => (
			<TransProvider
				lng={baseLocale}
				options={{
					resources,
					debug: true,
					lng: baseLocale,
					fallbackLng: baseLocale,
					supportedLngs: [...supportedLocales],
					ns: [...bucketNames],
					defaultNS: 'app',
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
		root,
	);
})();
