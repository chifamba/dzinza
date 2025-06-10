import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import { createMockI18n } from '../i18n/utils/testUtils.tsx';
import enAuthTranslations from '../i18n/locales/en/auth.json'; // Import translations

// Mock API client
jest.mock('../services/api/auth', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    requestPasswordReset: jest.fn(),
    refreshToken: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next'; // Import full i18next for type if needed, or use i18n type from createMockI18n

// Re-initialize mockI18nInstance for auth tests to ensure 'auth' is the default namespace
// and resources are correctly loaded for it.
const authTestI18nInstance = i18next.createInstance();
authTestI18nInstance.use(require('react-i18next').initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'auth'], // Ensure auth is listed
  defaultNS: 'auth',     // Set auth as default
  resources: {
    en: {
      common: require('../i18n/locales/en/common.json'), // ensure common is also available
      auth: enAuthTranslations, // Explicitly use imported auth translations
    },
  },
  debug: false, // Set to true for verbose i18next logging
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  // Add the parseMissingKeyHandler from testUtils if needed, though ideally keys should exist
  parseMissingKeyHandler: (key) => key, // Simple fallback for missing keys
});


const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <I18nextProvider i18n={authTestI18nInstance}> {/* Use dedicated auth i18n instance */}
      <AuthProvider>
        {children}
      </AuthProvider>
    </I18nextProvider>
  </BrowserRouter>
);

describe('Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Login Component', () => {
    it('renders login form', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: enAuthTranslations.signIn.title })).toBeInTheDocument();
      expect(screen.getByLabelText(enAuthTranslations.signIn.email)).toBeInTheDocument();
      // For the password label in Login, ensure it's specific if there are multiple "Password" texts
      expect(screen.getByLabelText(new RegExp(`^${enAuthTranslations.signIn.password}$`))).toBeInTheDocument();
      expect(screen.getByRole('button', { name: enAuthTranslations.signIn.signInButton })).toBeInTheDocument();
    });

    it('shows validation errors for empty fields', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: enAuthTranslations.signIn.signInButton });
      fireEvent.click(submitButton);

      // Using findByText which automatically uses waitFor
      expect(await screen.findByText(enAuthTranslations.validation.emailRequired)).toBeInTheDocument();
      expect(await screen.findByText(enAuthTranslations.validation.passwordRequired)).toBeInTheDocument();
    });

    it('toggles password visibility', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(new RegExp(`^${enAuthTranslations.signIn.password}$`));
      const toggleButton = screen.getByRole('button', { name: 'Toggle password visibility' });

      expect(passwordInput).toHaveAttribute('type', 'password');
      
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Register Component', () => {
    it('renders registration form', () => {
      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: enAuthTranslations.signUp.title })).toBeInTheDocument();
      expect(screen.getByLabelText(enAuthTranslations.signUp.firstName)).toBeInTheDocument();
      expect(screen.getByLabelText(enAuthTranslations.signUp.lastName)).toBeInTheDocument();
      expect(screen.getByLabelText(enAuthTranslations.signUp.email)).toBeInTheDocument();
      expect(screen.getByLabelText(new RegExp(`^${enAuthTranslations.signUp.password}$`))).toBeInTheDocument();
      expect(screen.getByLabelText(enAuthTranslations.signUp.confirmPassword)).toBeInTheDocument();
    });

    it('validates password confirmation', async () => {
      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(new RegExp(`^${enAuthTranslations.signUp.password}$`));
      const confirmPasswordInput = screen.getByLabelText(enAuthTranslations.signUp.confirmPassword);

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });

      await waitFor(() => {
        expect(screen.getByText(enAuthTranslations.validation.passwordsNoMatch)).toBeInTheDocument();
      });
    });

    it('shows password strength indicator', async () => {
      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(new RegExp(`^${enAuthTranslations.signUp.password}$`));
      fireEvent.change(passwordInput, { target: { value: 'weak' } });

      await waitFor(() => {
        // Check for the text based on the key in enAuthTranslations.json
        // Input 'weak' results in strength 1, which is 'Very Weak'
        expect(screen.getByText(enAuthTranslations.password.veryWeak)).toBeInTheDocument();
      });

      fireEvent.change(passwordInput, { target: { value: 'StrongP@ssw0rd!' } });

      await waitFor(() => {
        expect(screen.getByText(enAuthTranslations.password.strong)).toBeInTheDocument();
      });
    });
  });

  describe('Forgot Password Component', () => {
    it('renders forgot password form', () => {
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', {name: enAuthTranslations.forgotPassword.title})).toBeInTheDocument();
      expect(screen.getByLabelText(enAuthTranslations.forgotPassword.email)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: enAuthTranslations.forgotPassword.sendReset })).toBeInTheDocument();
    });

    it('validates email format', async () => {
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(enAuthTranslations.forgotPassword.email);
      const submitButton = screen.getByRole('button', { name: enAuthTranslations.forgotPassword.sendReset });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      // Using findByText which automatically uses waitFor
      expect(await screen.findByText(enAuthTranslations.validation.invalidEmail)).toBeInTheDocument();
      // screen.debug(undefined, 300000); // Optional: for debugging
    });
  });

  describe('Authentication Flow', () => {
    it('stores tokens on successful login', async () => {
      const mockLogin = jest.fn().mockResolvedValue({
        user: { id: '1', email: 'test@example.com', firstName: 'Test' },
        tokens: { accessToken: 'token', refreshToken: 'refresh' }
      });

      jest.mocked(require('../services/api/auth').authApi.login).mockImplementation(mockLogin);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(enAuthTranslations.signIn.email);
      const passwordInput = screen.getByLabelText(new RegExp(`^${enAuthTranslations.signIn.password}$`));
      const submitButton = screen.getByRole('button', { name: enAuthTranslations.signIn.signInButton });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          mfaCode: '',
        });
      });
    });

    it('handles authentication errors', async () => {
      const mockLogin = jest.fn().mockRejectedValue({
        response: { data: { message: enAuthTranslations.errors.invalidCredentials } }
      });

      jest.mocked(require('../services/api/auth').authApi.login).mockImplementation(mockLogin);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(enAuthTranslations.signIn.email);
      const passwordInput = screen.getByLabelText(new RegExp(`^${enAuthTranslations.signIn.password}$`));
      const submitButton = screen.getByRole('button', { name: enAuthTranslations.signIn.signInButton });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(enAuthTranslations.errors.invalidCredentials)).toBeInTheDocument();
      });
    });
  });
});
