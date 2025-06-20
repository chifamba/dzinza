import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Mail } from 'lucide-react';
import { authApi } from '../../services/api/auth';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Alert } from '../../components/ui/Alert';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(''); // For API errors
  const [formError, setFormError] = useState(''); // For client-side validation errors
  const { t } = useTranslation('auth');

  const validateEmail = () => {
    if (!email) {
      setFormError(t('validation.emailRequired'));
      return false;
    }
    // Basic email regex, consider a more robust one if needed
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError(t('validation.emailInvalid'));
      return false;
    }
    setFormError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous API errors
    if (!validateEmail()) {
      setIsLoading(false); // Ensure loading is stopped if validation fails
      return;
    }
    setIsLoading(true);

    try {
      await authApi.requestPasswordReset({ email });
      setIsSubmitted(true);
    } catch (err: unknown) {
      let message = t('errors.serverError'); // Default error message
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          message = axiosError.response.data.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10"
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                {t('forgotPassword.success')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-dzinza-600 hover:bg-dzinza-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dzinza-500"
                >
                  {t('forgotPassword.backToSignIn')}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10"
        >
          <div className="mb-6">
            <Link
              to="/login"
              className="flex items-center text-sm text-dzinza-600 hover:text-dzinza-500"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('forgotPassword.backToSignIn')}
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              {t('forgotPassword.title')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 text-center">
              {t('forgotPassword.subtitle')}
            </p>
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <Alert
                variant="error"
                message={error}
                onClose={() => setError('')}
              />
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('forgotPassword.email')}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-dzinza-500 focus:border-dzinza-500 sm:text-sm"
                  placeholder="Enter your email address"
                />
              </div>
              {formError && <p role="alert" className="text-red-500 text-xs mt-1">{formError}</p>}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-dzinza-600 hover:bg-dzinza-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dzinza-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  t('forgotPassword.sendReset')
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
