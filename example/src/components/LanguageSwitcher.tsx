import { useTransContext } from '@mbarzda/solid-i18next';
import i18next from 'i18next';

const LanguageSwitcher = () => {
  const [t, { changeLanguage }] = useTransContext();

  function handleLanguageChange(event: { target: { value: string } }) {
    changeLanguage(event.target.value);
  }

  return (
    <div>
      <select value={i18next.language} onChange={handleLanguageChange}>
        <option value="en">{t('englishLabel')}</option>
        <option value="ru">{t('russianLabel')}</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
