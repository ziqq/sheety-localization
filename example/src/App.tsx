// import { Component } from 'solid-js';
// import RoutesConfig from './routes';

// const App: Component = () => <RoutesConfig />;
// export default App;

import { Trans, useTransContext } from '@mbarzda/solid-i18next';
import { For, createEffect, Show } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { Task } from './types';
import MainLayout from './layouts/MainLayout';

const App = () => {
  const [t] = useTransContext();
  return (
    <MainLayout>
      <h1>Welcome!</h1>
      <p>This is your main content.</p>
      <br />
      <h1>{t('title')}</h1>
      <Trans key="title" />
    </MainLayout>
  );
};

export default App;
