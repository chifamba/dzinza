import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithI18n, validateTranslationKeys, checkTranslationCoverage } from '../src/i18n/utils/testUtils';
import { screen } from '@testing-library/react';
import { LanguageSelector } from '../src/components/LanguageSelector';

describe('Internationalization', () => {
  describe('LanguageSelector Component', () => {
    it('renders language selector with current language', () => {
      renderWithI18n(<LanguageSelector />);
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('renders language selector in Shona', () => {
      renderWithI18n(<LanguageSelector />, { language: 'sn' });
      expect(screen.getByText('ChiShona')).toBeInTheDocument();
    });

    it('renders language selector in Ndebele', () => {
      renderWithI18n(<LanguageSelector />, { language: 'nd' });
      expect(screen.getByText('IsiNdebele')).toBeInTheDocument();
    });
  });

  describe('Translation Key Validation', () => {
    it('validates common namespace keys exist in all languages', async () => {
      const commonKeys = [
        'navigation.dashboard',
        'navigation.familyTree',
        'navigation.login',
        'actions.save',
        'actions.cancel',
        'status.loading'
      ];

      const languages = ['en', 'sn', 'nd'];
      
      for (const language of languages) {
        const { missing } = await validateTranslationKeys('common', language, commonKeys);
        expect(missing).toHaveLength(0);
      }
    });

    it('validates dashboard namespace keys exist in all languages', async () => {
      const dashboardKeys = [
        'stats.totalMembers',
        'stats.dnaMatches',
        'stats.records',
        'stats.photos'
      ];

      const languages = ['en', 'sn', 'nd'];
      
      for (const language of languages) {
        const { missing } = await validateTranslationKeys('dashboard', language, dashboardKeys);
        expect(missing).toHaveLength(0);
      }
    });
  });

  describe('Translation Coverage', () => {
    it('checks translation coverage across all namespaces', async () => {
      const namespaces = ['common', 'dashboard', 'familyTree', 'auth', 'profile'];
      const languages = ['en', 'sn', 'nd'];
      
      const coverage = await checkTranslationCoverage(namespaces, languages);
      
      // English should have 100% coverage (it's the base language)
      const englishCoverage = coverage.filter(c => c.language === 'en');
      englishCoverage.forEach(c => {
        expect(c.coverage).toBe(100);
      });
      
      // Other languages should have reasonable coverage (>80%)
      const otherLanguages = coverage.filter(c => c.language !== 'en');
      otherLanguages.forEach(c => {
        expect(c.coverage).toBeGreaterThan(80);
      });
    });
  });

  describe('Language Switching', () => {
    it('switches between supported languages', async () => {
      const { i18n } = renderWithI18n(<div>Test</div>);
      
      // Test switching to Shona
      await i18n.changeLanguage('sn');
      expect(i18n.language).toBe('sn');
      
      // Test switching to Ndebele
      await i18n.changeLanguage('nd');
      expect(i18n.language).toBe('nd');
      
      // Test switching back to English
      await i18n.changeLanguage('en');
      expect(i18n.language).toBe('en');
    });
  });

  describe('Cultural Formatting', () => {
    it('formats dates according to locale', () => {
      const testDate = new Date('2023-12-25');
      
      // Test English formatting
      const enDate = new Intl.DateTimeFormat('en').format(testDate);
      expect(enDate).toContain('12');
      expect(enDate).toContain('25');
      
      // Test Zimbabwean English formatting
      const zwDate = new Intl.DateTimeFormat('en-ZW').format(testDate);
      expect(zwDate).toBeDefined();
    });

    it('formats numbers according to locale', () => {
      const testNumber = 1234.56;
      
      // Test English formatting
      const enNumber = new Intl.NumberFormat('en').format(testNumber);
      expect(enNumber).toContain('1,234');
      
      // Test Zimbabwean formatting
      const zwNumber = new Intl.NumberFormat('en-ZW').format(testNumber);
      expect(zwNumber).toBeDefined();
    });

    it('formats currency for Zimbabwe (USD)', () => {
      const testAmount = 1234.56;
      
      const usdCurrency = new Intl.NumberFormat('en-ZW', {
        style: 'currency',
        currency: 'USD'
      }).format(testAmount);
      
      expect(usdCurrency).toContain('$');
      expect(usdCurrency).toContain('1,234');
    });
  });

  describe('Missing Translation Handling', () => {
    it('falls back to key when translation is missing', () => {
      const { i18n } = renderWithI18n(<div>Test</div>);
      
      // Test with a non-existent key
      const result = i18n.t('nonexistent.key');
      expect(result).toBe('nonexistent.key');
    });

    it('handles interpolation with missing translations', () => {
      const { i18n } = renderWithI18n(<div>Test</div>);
      
      // Test interpolation with non-existent key
      const result = i18n.t('nonexistent.key', { name: 'John' });
      expect(result).toContain('John');
    });
  });
});
