import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useI18n } from '../contexts/i18n.context';
import { useL10n } from '../contexts/l10n.context';
import type { SupportedLocale } from '../locales/index.js';
import { LanguageIcon } from './Icon';

export function LanguageSwitcherL10n() {
  const { locale, changeLocale, availableLocales, getLanguageName, isLoading, t } = useL10n();
  const [isOpen, setIsOpen] = createSignal(false);
  const [triggerRef, setTriggerRef] = createSignal<HTMLButtonElement>();
  const [dropdownRef, setDropdownRef] = createSignal<HTMLDivElement>();

  const handleLanguageChange = async (newLocale: SupportedLocale) => {
    const success = await changeLocale(newLocale);
    if (success) {
      setIsOpen(false);
      console.log('🌐 Language selector: Locale changed successfully');
    } else {
      console.error('🌐 Language selector: Failed to change locale');
    }
  };

  const getCurrentLanguageName = () => getLanguageName(locale());

  const updateDropdownPosition = () => {
    const trigger = triggerRef();
    const dropdown = dropdownRef();

    if (!trigger || !dropdown) {
      // Don't warn if dropdown is simply not open yet
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();

    console.log('LanguageSwitcher: Updating position', {
      triggerRect,
      dropdownRect,
      scrollY: window.scrollY,
      scrollX: window.scrollX,
    });

    // Position dropdown below trigger
    let top = triggerRect.bottom + 4;
    let left = triggerRect.right - dropdownRect.width;

    // Keep dropdown within viewport
    if (left < 8) {
      left = triggerRect.left;
    }

    if (top + dropdownRect.height > window.innerHeight - 8) {
      top = triggerRect.top - dropdownRect.height - 4;
    }

    console.log('LanguageSwitcher: Setting position', { top, left });

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
  };

  const handleClickOutside = (event: MouseEvent) => {
    const trigger = triggerRef();
    const dropdown = dropdownRef();

    if (!trigger || !dropdown) return;

    if (!trigger.contains(event.target as Node) && !dropdown.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', updateDropdownPosition, { passive: true });
    window.addEventListener('resize', updateDropdownPosition, { passive: true });
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
    window.removeEventListener('scroll', updateDropdownPosition);
    window.removeEventListener('resize', updateDropdownPosition);
  });

  return (
    <div class="language-switcher">
      <button
        ref={setTriggerRef}
        class="language-switcher-trigger"
        onClick={() => {
          if (isLoading()) {
            return;
          }

          const newState = !isOpen();
          setIsOpen(newState);
          if (newState) {
            // Schedule position update after render
            requestAnimationFrame(() => {
              updateDropdownPosition();
            });
          }
        }}
        aria-label={getCurrentLanguageName()}
        aria-expanded={isOpen()}
        aria-haspopup="menu"
        aria-busy={isLoading()}
      >
        <LanguageIcon size={18} aria-hidden="true" />
        <span class="language-switcher-current">{getCurrentLanguageName()}</span>
        <span class="language-switcher-arrow" aria-hidden="true">
          {isOpen() ? '▲' : '▼'}
        </span>
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            ref={(el) => {
              setDropdownRef(el);
              if (el) {
                // Обновляем позицию сразу после установки ref
                requestAnimationFrame(() => updateDropdownPosition());
              }
            }}
            class="language-switcher-dropdown language-switcher-dropdown--portal"
            role="menu"
            aria-label={t('app', 'language')}
            style={{ position: 'fixed', top: '0px', left: '0px' }}
          >
            <For each={availableLocales}>
              {(loc) => (
                <button
                  class={`language-switcher-option ${locale() === loc ? 'language-switcher-option--active' : ''}`}
                  role="menuitem"
                  onClick={() => {
                    void handleLanguageChange(loc);
                  }}
                  aria-label={getLanguageName(loc)}
                  aria-current={locale() === loc ? 'true' : 'false'}
                  disabled={isLoading()}
                >
                  <span class="language-switcher-option-code">{loc.toUpperCase()}</span>
                  <span class="language-switcher-option-name">{getLanguageName(loc)}</span>
                  <Show when={locale() === loc}>
                    <span class="language-switcher-option-check" aria-hidden="true">
                      ✓
                    </span>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

export const LanguageSwitcherI18n = () => {
  const { locale, changeLocale, availableLocales, getLanguageName } = useI18n();

  function handleLanguageChange(event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    changeLocale(target.value as SupportedLocale);
  }

  return (
    <div class="flex items-center gap-2">
      <span class="text-sm text-slate-500">solid-i18next</span>
      <select
        name="language-switcher-i18n"
        class="c-language-switcher mr-5"
        value={locale()}
        onChange={handleLanguageChange}
      >
        <For each={availableLocales}>
          {(currentLocale) => <option value={currentLocale}>{getLanguageName(currentLocale)}</option>}
        </For>
      </select>
    </div>
  );
};
