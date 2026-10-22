import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ha from './locales/ha.json';
import ig from './locales/ig.json';
import pcm from './locales/pcm.json';
import yo from './locales/yo.json';

export const resources = {
  en: { translation: en },
  ha: { translation: ha },
  ig: { translation: ig },
  pcm: { translation: pcm },
  yo: { translation: yo },
} as const;

export const supportedLanguages = ['en', 'ha', 'ig', 'pcm', 'yo'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;