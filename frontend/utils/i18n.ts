import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from '@/locales/pt-BR.json';
import enUS from '@/locales/en-US.json';
import esES from '@/locales/es-ES.json';
import frFR from '@/locales/fr-FR.json';
import deDE from '@/locales/de-DE.json';
import ruRU from '@/locales/ru-RU.json';
import zhCN from '@/locales/zh-CN.json';

const resources = {
  'pt-BR': { translation: ptBR },
  'en-US': { translation: enUS },
  'es-ES': { translation: esES },
  'fr-FR': { translation: frFR },
  'de-DE': { translation: deDE },
  'ru-RU': { translation: ruRU },
  'zh-CN': { translation: zhCN },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt-BR',
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
