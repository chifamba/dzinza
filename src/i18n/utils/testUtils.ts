import { i18n } from 'i18next';
import { render, RenderResult, RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ReactElement } from 'react';

/**
 * Mock i18n instance for testing
 */
export const createMockI18n = (language: string = 'en'): i18n => {
  const mockI18n = {
    language,
    languages: ['en', 'sn', 'nd'],
    t: jest.fn((key: string, options?: any) => {
      // Simple mock translation that returns the key with options interpolated
      if (options && typeof options === 'object') {
        let result = key;
        Object.keys(options).forEach(optionKey => {
          result = result.replace(`{{${optionKey}}}`, options[optionKey]);
        });
        return result;
      }
      return key;
    }),
    changeLanguage: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockReturnValue(true),
    getFixedT: jest.fn(),
    hasResourceBundle: jest.fn().mockReturnValue(true),
    loadNamespaces: jest.fn().mockResolvedValue(undefined),
    loadLanguages: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    isInitialized: true,
    options: {
      lng: language,
      fallbackLng: 'en',
      debug: false,
    },
  } as unknown as i18n;

  return mockI18n;
};

/**
 * Custom render function that includes i18n provider
 */
/*
export function renderWithI18n(
  ui: any, // Temporarily changed for debugging
  options: any // Temporarily changed for debugging
): any { // Temporarily changed to any for debugging parsing error
  const mockI18n = createMockI18n(options?.language || 'en');
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={mockI18n}>
      {children}
    </I18nextProvider>
  );

  // Extract language from options, so it's not passed down to RTL's render
  const { language, ...rtlOptions } = options;

  return {
    ...render(ui, { wrapper: Wrapper, ...rtlOptions }),
    i18n: mockI18n,
  };
};
*/

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
