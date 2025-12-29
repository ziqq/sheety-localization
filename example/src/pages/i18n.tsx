import { Trans, useTransContext } from '@mbarzda/solid-i18next';
import { Component } from 'solid-js';
import MainLayout from '../components/MainLayout';

const I18nPage: Component = () => {
  const [t] = useTransContext();
  return (
    <MainLayout>
      <h1 class="text-2xl font-bold">{t('welcomeTitle')}</h1>
      <Trans key="welcomeSubtitle" />
    </MainLayout>
  );
};

export default I18nPage;
