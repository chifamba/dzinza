import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translation files
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enFamilyTree from './locales/en/familyTree.json';
import enAuth from './locales/en/auth.json';
import enProfile from './locales/en/profile.json';

import snCommon from './locales/sn/common.json';
import snDashboard from './locales/sn/dashboard.json';
import snFamilyTree from './locales/sn/familyTree.json';
import snAuth from './locales/sn/auth.json';
import snProfile from './locales/sn/profile.json';

import ndCommon from './locales/nd/common.json';
import ndDashboard from './locales/nd/dashboard.json';
import ndFamilyTree from './locales/nd/familyTree.json';
import ndAuth from './locales/nd/auth.json';
import ndProfile from './locales/nd/profile.json';

// Language resources
const resources = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    familyTree: enFamilyTree,
    auth: enAuth,
    profile: enProfile,
  },
  sn: {
    common: snCommon,
    dashboard: snDashboard,
    familyTree: snFamilyTree,
    auth: snAuth,
    profile: snProfile,
  },
  nd: {
    common: ndCommon,
    dashboard: ndDashboard,
    familyTree: ndFamilyTree,
    auth: ndAuth,
    profile: ndProfile,
  },
};

// Language detection options
const detectionOptions = {
  order: ['localStorage', 'cookie', 'navigator', 'htmlTag', 'path', 'subdomain'],
  lookupLocalStorage: 'dzinza_language',
  lookupCookie: 'dzinza_language',
  caches: ['localStorage', 'cookie'],
  excludeCacheFor: ['cimode'],
  checkWhitelist: true,
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection
    detection: detectionOptions,
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'familyTree', 'auth', 'profile'],
    
    // Backend configuration for loading translations
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      allowMultiLoading: false,
    },
    
    // Language whitelist
    supportedLngs: ['en', 'sn', 'nd'],
    nonExplicitSupportedLngs: true,
    
    // React configuration
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
  });

export default i18n;
