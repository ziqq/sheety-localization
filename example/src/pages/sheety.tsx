import { Component } from 'solid-js';
import MainLayout from '../components/MainLayout';
import { useL10n } from '../contexts/l10n.context';
import { bucketKeys, bucketNames, messageMeta } from '../locales/index.js';

const SheetyPage: Component = () => {
  const { l10n, t } = useL10n();
  const subtitlePlaceholders = Object.keys(messageMeta.todo.subtitle?.placeholders ?? {});

  return (
    <MainLayout>
      <div class="space-y-6">
        <div>
          <h1 class="text-2xl font-bold">Generated Sheety Localization API</h1>
          <p class="mt-2 text-slate-600">
            This page reads directly from generated manifest data and the preloaded localization object.
          </p>
        </div>

        <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-lg font-semibold">Localization output</h2>
          <p class="mt-2">{l10n()?.app.welcomeTitle() ?? t('app', 'welcomeTitle')}</p>
          <p class="text-slate-600">{l10n()?.app.welcomeSubtitle() ?? t('app', 'welcomeSubtitle')}</p>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-lg font-semibold">Generated manifest</h2>
          <p class="mt-2">
            <strong>Buckets:</strong> {bucketNames.join(', ')}
          </p>
          <p>
            <strong>Todo keys:</strong> {bucketKeys.todo.join(', ')}
          </p>
          <p>
            <strong>Subtitle placeholders:</strong> {subtitlePlaceholders.join(', ') || 'none'}
          </p>
        </section>
      </div>
    </MainLayout>
  );
};

export default SheetyPage;
