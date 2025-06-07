import { i18n } from 'i18next';

/**
 * Get the saved language preference from localStorage
 */
export const getSavedLanguage = (): string | null => {
  try {
    return localStorage.getItem('dzinza-language');
  } catch (error) {
    console.warn('Failed to get saved language from localStorage:', error);
    return null;
  }
};

/**
 * Save language preference to localStorage
 */
export const saveLanguage = (languageCode: string): void => {
  try {
    localStorage.setItem('dzinza-language', languageCode);
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error);
  }
};

/**
 * Get browser language with fallback
 */
export const getBrowserLanguage = (): string => {
  if (typeof navigator === 'undefined') return 'en';
  
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  
  // Map browser language codes to our supported languages
  const langMap: Record<string, string> = {
    'en': 'en',
    'en-US': 'en',
    'en-GB': 'en',
    'sn': 'sn',
    'sn-ZW': 'sn',
    'nd': 'nd',
    'nd-ZW': 'nd',
  };
  
  return langMap[browserLang] || langMap[browserLang.split('-')[0]] || 'en';
};

/**
 * Detect the best language to use
 */
export const detectLanguage = (): string => {
  // Priority: saved language > browser language > default
  const savedLang = getSavedLanguage();
  if (savedLang) return savedLang;
  
  return getBrowserLanguage();
};

/**
 * Initialize language detection and persistence
 */
export const initializeLanguage = (i18nInstance: i18n): void => {
  const detectedLanguage = detectLanguage();
  
  // Set the language if it's different from current
  if (i18nInstance.language !== detectedLanguage) {
    i18nInstance.changeLanguage(detectedLanguage);
  }
  
  // Save the language preference
  saveLanguage(detectedLanguage);
  
  // Listen for language changes and persist them
  i18nInstance.on('languageChanged', (lng: string) => {
    saveLanguage(lng);
    
    // Update document language attribute for accessibility
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lng;
    }
  });
};
