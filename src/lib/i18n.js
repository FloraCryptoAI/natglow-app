import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import es from '../locales/es.json';

function detectLang() {
  const saved = localStorage.getItem('natglow_lang');
  if (saved === 'es' || saved === 'en') return saved;
  const lang = (navigator.language || 'en').toLowerCase();
  return lang.startsWith('es') ? 'es' : 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: detectLang(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export function setLang(lang) {
  localStorage.setItem('natglow_lang', lang);
  i18n.changeLanguage(lang);
}

export function getLang() {
  return i18n.language;
}

export default i18n;
