import { Component, Show, createEffect, createMemo, createSignal } from 'solid-js';
import { useTransContext } from '@mbarzda/solid-i18next';
import { useI18n } from '../contexts/i18n.context';
import { LanguageSwitcher, LanguageSwitcher$Sheety } from './LanguageSwitcher';
import { useLocation } from '@solidjs/router';

const Header: Component<{ class: string }> = (props) => {
  const [sheety] = useTransContext();
  const { isReady, t } = useI18n();
  const location = useLocation();
  const pathname = createMemo(() => location.pathname);
  // This runs whenever route changes
  createEffect(() => {
    console.log('Route changed:', pathname());
  });
  return (
    <Show when={isReady()} fallback={<div class="header-loading">Loading...</div>} keyed>
      <header class={[props.class, 'l-app-header'].join(' ')}>
        <Show when={pathname() === '/' || pathname() === '/sheety'}>
          <h1 class="l-app-header__title">Sheety Localization Example</h1>
          <div class="flex items-center">
            <LanguageSwitcher$Sheety />
          </div>
        </Show>
        <Show when={pathname() == '/i18n'} keyed>
          <h1 class="l-app-header__title">i18n Localization Example</h1>
          <div class="flex items-center">
            <LanguageSwitcher />
          </div>
        </Show>

        {/* User profile & Notification icon */}
      </header>
    </Show>
  );
};

export default Header;
