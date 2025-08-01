import { useTransContext } from '@mbarzda/solid-i18next';
import i18next from 'i18next';

const LanguageSwitcher = () => {
  const [t, { changeLanguage }] = useTransContext();

  function handleLanguageChange(event) {
    changeLanguage(event.target.value);
  }

  return (
    <div>
      <select value={i18next.language} onChange={handleLanguageChange}>
        <option value="en-US">{t('english_label')}</option>
        <option value="ru-RU">{t('russian_label')}</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
