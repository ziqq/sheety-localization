import { Component } from 'solid-js';
import LanguageSwitcher from './LanguageSwitcher';
import { style } from 'solid-js/web';
import { useTransContext } from '@mbarzda/solid-i18next';

const Header: Component<{ class: string }> = (props) => {
  const [t] = useTransContext();
  return (
    <header class={[props.class, 'l-app-header'].join(' ')}>
      <h1 class="l-app-header__title">{t('title')}</h1>

      <LanguageSwitcher />

      {/* User profile & Notification icon */}
    </header>
  );
};

export default Header;
