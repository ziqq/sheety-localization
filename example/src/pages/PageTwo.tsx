import { Trans, useTransContext } from '@mbarzda/solid-i18next';
import { Component } from 'solid-js';
import MainLayout from '../layouts/MainLayout';

const PageTwo: Component = () => {
  const [t] = useTransContext();
  return (
    <MainLayout>
      <h1 class="text-2xl font-bold">{t('welcomeTitle')}</h1>
      <Trans key="welcomeSubtitle" />
      <h1 class="text-xl font-bold mt-10">Page Two</h1>
    </MainLayout>
  );
};
export default PageTwo;
