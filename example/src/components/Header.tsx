import { useLocation } from '@solidjs/router';
import { Component, Show, createMemo } from 'solid-js';
import { useI18n } from '../contexts/i18n.context';
import { useL10n } from '../contexts/l10n.context';
import { LanguageSwitcherI18n, LanguageSwitcherL10n } from './LanguageSwitcher';

const Header: Component<{ class: string }> = (props) => {
  const { t: tI18n } = useI18n();
  const { isReady, t: tL10n } = useL10n();
  const location = useLocation();
  const isPackageExample = createMemo(() => location.pathname === '/' || location.pathname === '/sheety');
  const title = createMemo(() => {
    if (isPackageExample()) {
      return 'Generated Sheety Localization API';
    }

    switch (location.pathname) {
      case '/todo':
        return isReady() ? tL10n('todo', 'title') : 'Todo';
      case '/i18n':
        return tI18n('welcomeTitle');
      default:
        return isReady() ? tL10n('app', 'title') : 'Sheety Localization';
    }
  });

  return (
    <header class={[props.class, 'l-app-header'].join(' ')}>
      <h1 class="l-app-header__title">{title()}</h1>
      <div class="flex items-center">
        <Show when={isPackageExample()} fallback={<LanguageSwitcherI18n />}>
          <Show when={isReady()} fallback={<div class="header-loading">Loading...</div>}>
            <LanguageSwitcherL10n />
          </Show>
        </Show>
      </div>
    </header>
  );
};

export default Header;
