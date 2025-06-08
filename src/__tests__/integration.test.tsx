import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import i18n from '../i18n';

// Integration test for i18n functionality
describe('i18n Integration', () => {
  beforeEach(() => {
    // Reset to English before each test
    i18n.changeLanguage('en');
  });

  it('should render landing page with English translations by default', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for i18n to load and check for translated content
    expect(await screen.findByText(/Discover Your/i)).toBeInTheDocument();
    expect(await screen.findByText(/Family Story/i)).toBeInTheDocument();
    expect(await screen.findByText(/Start Your Journey/i)).toBeInTheDocument();
  });

  it('should switch languages when language selector is used', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for initial English content
    expect(await screen.findByText(/Discover Your/i)).toBeInTheDocument();

    // Change to Shona
    await i18n.changeLanguage('sn');
    
    // Wait for Shona content to appear
    // Note: These would need to be updated with actual Shona translations
    expect(await screen.findByText(/Wana/i)).toBeInTheDocument();
  });

  it('should persist language preference', async () => {
    // Change language
    await i18n.changeLanguage('nd');
    
    // Check if language is persisted in localStorage
    expect(localStorage.getItem('dzinza_language')).toBe('nd');
  });

  it('should load all required namespaces', () => {
    const requiredNamespaces = [
      'common',
      'dashboard', 
      'familyTree',
      'auth',
      'profile',
      'landing',
      'dnaMatching',
      'historicalRecords',
      'photoEnhancement'
    ];

    requiredNamespaces.forEach(namespace => {
      expect(i18n.hasResourceBundle('en', namespace)).toBe(true);
      expect(i18n.hasResourceBundle('sn', namespace)).toBe(true);
      expect(i18n.hasResourceBundle('nd', namespace)).toBe(true);
    });
  });

  it('should fallback to English for missing translations', async () => {
    await i18n.changeLanguage('sn');
    
    // Test a key that might not be translated
    const translation = i18n.t('common:welcome', { fallbackLng: 'en' });
    expect(typeof translation).toBe('string');
    expect(translation).not.toContain('common:welcome');
  });
});
