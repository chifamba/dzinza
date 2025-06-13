import React from 'react';
import i18nInstance, { i18n } from 'i18next'; // Import the actual i18next and type
import { render, RenderResult, RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ReactElement } from 'react';

// Import mock translations to use in the mock i18n instance
import enAuthTranslations from '../locales/en/auth.json';
import enCommonTranslations from '../locales/en/common.json';
// Add other namespaces/languages if they are commonly used in tests

/**
 * Creates a mock i18n instance for testing.
 * This instance uses actual i18next.init but with minimal resources.
 */
import { initReactI18next } from 'react-i18next'; // Import initReactI18next

export const createMockI18n = (language: string = 'en'): i18n => {
  const instance = i18nInstance.createInstance(); // Create a new i18next instance
  instance
    .use(initReactI18next) // Add this line
    .init({
      lng: language,
      fallbackLng: 'en',
    ns: ['common', 'auth', 'profile', 'dashboard', 'familyTree', 'landing', 'dnaMatching', 'historicalRecords', 'photoEnhancement'], // Ensure all used namespaces are listed
    defaultNS: 'common',
    debug: false, // Set to true to see i18next logs in tests
    resources: { // Provide minimal resources for testing
      en: {
        auth: enAuthTranslations, // Use actual translations for 'auth'
        common: enCommonTranslations, // Use actual translations for 'common'
        // Add other namespaces as needed for tests
        // profile: { 'profile.title': 'Profile Page [mocked]' },
      },
      // sn: { auth: { 'login.title': 'Pinda muAkaundi Yako [mocked]' } }, // Example for other languages
    },
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    react: {
      useSuspense: false, // Tests generally don't need suspense
    },
    parseMissingKeyHandler: (key, defaultValue, options) => {
      // If interpolation values are provided, append them to the key
      if (options && Object.keys(options).length > 0) {
        // Basic stringification of options for the test expectation
        // A more sophisticated approach might be needed for complex objects
        const interpolations = Object.entries(options)
          .map(([optKey, optVal]) => `${optKey}=${optVal}`)
          .join(', ');
        return `${key} {${interpolations}}`; // Mimic common interpolation format
      }
      return key; // Default behavior: return the key itself
    }
  });
  return instance;
};

/**
 * Custom render function that includes i18n provider
 */
export function renderWithI18n(
  ui: ReactElement, // Use ReactElement for better type safety
  options?: RenderOptions & { language?: string; i18nInstance?: i18n }
): RenderResult & { i18n: i18n } {
  // Use the provided i18n instance or create a new mock one
  const i18nForTest = options?.i18nInstance || createMockI18n(options?.language || 'en');
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={i18nForTest}>
      {children}
    </I18nextProvider>
  );

  // Extract custom options before passing to RTL's render
  const { language, i18nInstance, ...rtlOptions } = options || {};

  return {
    ...render(ui, { wrapper: Wrapper, ...rtlOptions }),
    i18n: i18nForTest, // Return the instance used in this render
  };
};

/**
 * Test helper to validate translation keys exist
 */
export const validateTranslationKeys = async (
  namespace: string,
  language: string,
  expectedKeys: string[]
): Promise<{ missing: string[]; found: string[] }> => {
  try {
    // In a real implementation, this would load the actual translation files
    const translationModule = await import(`../locales/${language}/${namespace}.json`);
    const translations = translationModule.default || translationModule;
    
    const missing: string[] = [];
    const found: string[] = [];
    
    expectedKeys.forEach(key => {
      if (hasNestedKey(translations, key)) {
        found.push(key);
      } else {
        missing.push(key);
      }
    });
    
    return { missing, found };
  } catch (error) {
    console.error(`Failed to load translations for ${language}/${namespace}:`, error);
    return { missing: expectedKeys, found: [] };
  }
};

/**
 * Helper to check for nested object keys using dot notation
 */
const hasNestedKey = (obj: any, key: string): boolean => {
  const keys = key.split('.');
  let current = obj;
  
  for (const k of keys) {
    if (current === null || current === undefined || !(k in current)) {
      return false;
    }
    current = current[k];
  }
  
  return true;
};

/**
 * Test language switching functionality
 */
export const testLanguageSwitching = async (
  i18nInstance: i18n,
  targetLanguage: string
): Promise<boolean> => {
  try {
    await i18nInstance.changeLanguage(targetLanguage);
    return i18nInstance.language === targetLanguage;
  } catch (error) {
    console.error('Language switching failed:', error);
    return false;
  }
};

/**
 * Mock translation coverage checker
 */
export const checkTranslationCoverage = async (
  namespaces: string[],
  languages: string[]
): Promise<{
  namespace: string;
  language: string;
  coverage: number;
  missing: string[];
}[]> => {
  const results: {
    namespace: string;
    language: string;
    coverage: number;
    missing: string[];
  }[] = [];

  for (const namespace of namespaces) {
    for (const language of languages) {
      try {
        const baseTranslations = await import(`../locales/en/${namespace}.json`);
        const targetTranslations = language === 'en' 
          ? baseTranslations 
          : await import(`../locales/${language}/${namespace}.json`);
        
        const baseKeys = extractAllKeys(baseTranslations.default || baseTranslations);
        const targetKeys = extractAllKeys(targetTranslations.default || targetTranslations);
        
        const missing = baseKeys.filter(key => !targetKeys.includes(key));
        const coverage = ((baseKeys.length - missing.length) / baseKeys.length) * 100;
        
        results.push({
          namespace,
          language,
          coverage: Math.round(coverage * 100) / 100,
          missing,
        });
      } catch (error) {
        console.error(`Failed to check coverage for ${language}/${namespace}:`, error);
        results.push({
          namespace,
          language,
          coverage: 0,
          missing: [],
        });
      }
    }
  }

  return results;
};

/**
 * Extract all keys from a nested object using dot notation
 */
const extractAllKeys = (obj: any, prefix: string = ''): string[] => {
  let keys: string[] = [];
  
  Object.keys(obj).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(extractAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  });
  
  return keys;
};

/**
 * Test cultural formatting functions
 */
export const testCulturalFormatting = (locale: string) => {
  const testDate = new Date('2023-12-25');
  const testNumber = 1234.56;
  
  return {
    date: new Intl.DateTimeFormat(locale).format(testDate),
    number: new Intl.NumberFormat(locale).format(testNumber),
    currency: new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
    }).format(testNumber),
  };
};

/**
 * Performance test for translation loading
 */
export const measureTranslationLoadTime = async (
  namespace: string,
  language: string
): Promise<number> => {
  const startTime = performance.now();
  
  try {
    await import(`../locales/${language}/${namespace}.json`);
    return performance.now() - startTime;
  } catch (error) {
    console.error(`Failed to load ${language}/${namespace}:`, error);
    return -1;
  }
};
