/**
 * Copyright © 2026 Olcaytp. All rights reserved.
 * This file is part of the Construction Management Application.
 * Licensed under the MIT License. See LICENSE file for details.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import sv from './locales/sv.json';
import tr from './locales/tr.json';

const savedLanguage = localStorage.getItem('language') || 'tr';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sv: { translation: sv },
      tr: { translation: tr },
    },
    lng: savedLanguage,
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
