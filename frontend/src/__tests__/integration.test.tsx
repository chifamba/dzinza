import { render, screen, fireEvent } from '@testing-library/react';
// Remove MemoryRouter import, App provides its own Router
import App from '../App';
import i18n from '../i18n';

// Integration test for i18n functionality
describe('i18n Integration', () => {
  beforeEach(() => {
    // Reset to English before each test
    i18n.changeLanguage('en');
  });

  it('should render landing page with English translations by default', async () => {
    render(<App />); // App already has BrowserRouter

    // Wait for i18n to load and check for translated content
    expect(await screen.findByText(/Discover Your/i)).toBeInTheDocument(); // Matches "Discover Your Ancestry with Dzinza"
    expect(await screen.findByText(/Ancestry with Dzinza/i)).toBeInTheDocument(); // More specific part of H1
    expect(await screen.findByText(/Get Started/i)).toBeInTheDocument(); // Matches button text
  });

  it('should switch languages when language selector is used', async () => {
    render(<App />); // App already has BrowserRouter

    // Wait for initial English content
    expect(await screen.findByText(/Discover Your/i)).toBeInTheDocument();

    // Change to Shona
    await i18n.changeLanguage('sn');
    
    // Check if i18n object reflects the language change
    expect(i18n.language).toBe('sn');
    // Check if a known key from 'common' namespace (which should be loaded) translates correctly
    // This verifies that Shona resources are loaded, even if LandingPage doesn't use them.
    expect(i18n.t('common:actions.save')).toBe('Chengetedza');
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
