import { Trans } from '@mbarzda/solid-i18next';
import { Component } from 'solid-js';
import { useI18n } from '../contexts/i18n.context';
import MainLayout from '../components/MainLayout';

const I18nPage: Component = () => {
  const { t } = useI18n();

  return (
    <MainLayout>
      <div class="space-y-6">
        <div>
          <h1 class="text-2xl font-bold">{t('welcomeTitle')}</h1>
          <p class="mt-2 text-slate-600">
            <Trans key="welcomeSubtitle" />
          </p>
        </div>

        <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-lg font-semibold">solid-i18next interoperability</h2>
          <p class="mt-2 text-slate-600">
            This route keeps the classic solid-i18next flow as a separate consumer of generated resources.
          </p>
          <p class="mt-3">
            <strong>Todo sample:</strong> {t('todo:subtitle', { numberOfTasks: '3' })}
          </p>
          <p>
            <strong>Default namespace:</strong> app
          </p>
          <p>
            <strong>Namespaces:</strong> app, errors, todo
          </p>
        </section>
      </div>
    </MainLayout>
  );
};

export default I18nPage;
