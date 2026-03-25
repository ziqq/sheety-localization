import { Component } from 'solid-js';
import { Router } from '@solidjs/router';
import { I18nProvider } from './contexts/i18n.context';
import { L10nProvider } from './contexts/l10n.context';
import Header from './components/Header';
import Menu from './components/Menu';
import routes from './routes';

const App: Component<{ children?: any }> = (props: any) => (
  <I18nProvider>
    <L10nProvider>
      <div class="l-app">
        <Header class="l-app__header" />
        <div class="l-app__body l-app-body">
          <Menu class="l-app-body__drawer" />
          <main class="l-app-body__content">{props.children}</main>
        </div>
      </div>
    </L10nProvider>
  </I18nProvider>
);

export default App;
