import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ptPT from './locales/pt-PT.json';

export const SUPPORTED_LANGUAGES = ['en', 'pt-PT'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function updateDocumentLang(lng: string) {
  document.documentElement.lang = lng;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'pt-PT': { translation: ptPT },
    },
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lifehub-lang',
    },
  });

i18n.on('languageChanged', updateDocumentLang);
updateDocumentLang(i18n.language);

export default i18n;
