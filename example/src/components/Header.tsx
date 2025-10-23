import { Component, Show } from 'solid-js';
import { useTransContext } from '@mbarzda/solid-i18next';
import { useI18n } from '../contexts/i18n.context';
import { LanguageSwitcher, SheetyLanguageSwitcher } from './languageSwitcher';

const Header: Component<{ class: string }> = (props) => {
  const [sheety] = useTransContext();
  const { isReady, t } = useI18n();
  return (
    <Show when={isReady()} fallback={<div class="header-loading">Loading...</div>}>
      <header class={[props.class, 'l-app-header'].join(' ')}>
        <h1 class="l-app-header__title">Sheety: {sheety('title')}</h1>
        <h1 class="l-app-header__title">i18n: {t().app.title()}</h1>

        <div class="flex items-center">
          <SheetyLanguageSwitcher />
          <LanguageSwitcher />
        </div>

        {/* User profile & Notification icon */}
      </header>
    </Show>
  );
};

export default Header;
