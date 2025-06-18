import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Mail, CheckCircle, TreePine, RefreshCw } from 'lucide-react'; // Removed AlertCircle
import { authApi } from '../../services/api/auth';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Alert } from '../../components/ui/Alert';

const VerifyEmail = () => {
  const { t } = useTranslation('auth');
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const email = location.state?.email || user?.email;

  // Auto-verify if token is in URL
  const verifyEmail = useCallback(async (token: string) => {
    try {
      setIsVerifying(true);
      setError(null);
      
      await authApi.verifyEmail({ token });
      setIsVerified(true);
      
      // Redirect to dashboard after successful verification
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Email verification failed';
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  }, [navigate]); // Added navigate as a dependency

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');

    if (token) {
      verifyEmail(token);
    }
  }, [location.search, verifyEmail]); // Added verifyEmail to dependency array

  // Countdown for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const resendVerificationEmail = async () => {
    try {
      setIsResending(true);
      setError(null);
      setResendSuccess(false);
      
      await authApi.resendVerificationEmail();
      setResendSuccess(true);
      setCountdown(60); // 60 second cooldown
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to resend verification email';
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto h-16 w-16 text-green-500 mb-6"
            >
              <CheckCircle className="h-16 w-16" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-display">
              {t('verifyEmail.success.title')}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {t('verifyEmail.success.message')}
            </p>
            
            <p className="text-sm text-gray-500">
              {t('verifyEmail.success.redirecting')}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dzinza-50 to-dzinza-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.8 }}
            className="mx-auto h-12 w-12 text-dzinza-600"
          >
            <TreePine className="h-12 w-12" />
          </motion.div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 font-display">
            {t('verifyEmail.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('verifyEmail.subtitle')}
          </p>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-white p-8 rounded-xl shadow-lg"
        >
          {error && (
            <Alert variant="error" message={error} className="mb-6" />
          )}

          {resendSuccess && (
            <Alert 
              variant="success" 
              message={t('verifyEmail.resendSuccess')} 
              className="mb-6" 
            />
          )}

          <div className="text-center">
            <div className="mx-auto h-16 w-16 text-dzinza-400 mb-6">
              <Mail className="h-16 w-16" />
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('verifyEmail.checkEmail')}
            </h3>

            <p className="text-gray-600 mb-2">
              {t('verifyEmail.emailSentTo')}
            </p>

            <p className="text-sm font-medium text-gray-900 mb-6">
              {email}
            </p>

            <p className="text-sm text-gray-500 mb-8">
              {t('verifyEmail.clickLink')}
            </p>

            {/* Resend Button */}
            <motion.button
              whileHover={{ scale: countdown === 0 ? 1.02 : 1 }}
              whileTap={{ scale: countdown === 0 ? 0.98 : 1 }}
              onClick={resendVerificationEmail}
              disabled={isResending || countdown > 0}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-dzinza-600 bg-dzinza-50 hover:bg-dzinza-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dzinza-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isResending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('verifyEmail.resending')}
                </>
              ) : countdown > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('verifyEmail.resendIn', { seconds: countdown })}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('verifyEmail.resendEmail')}
                </>
              )}
            </motion.button>

            {/* Help Text */}
            <div className="mt-6 text-sm text-gray-500">
              <p className="mb-2">{t('verifyEmail.notReceived')}</p>
              <ul className="text-left space-y-1">
                <li>• {t('verifyEmail.checkSpam')}</li>
                <li>• {t('verifyEmail.checkEmail')}</li>
                <li>• {t('verifyEmail.tryResend')}</li>
              </ul>
            </div>

            {/* Navigation Links */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-center space-x-4 text-sm">
                <Link
                  to="/auth/login"
                  className="text-dzinza-600 hover:text-dzinza-500 font-medium transition-colors"
                >
                  {t('verifyEmail.backToLogin')}
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  to="/support"
                  className="text-gray-600 hover:text-gray-500 transition-colors"
                >
                  {t('verifyEmail.contactSupport')}
                </Link>
              </div>
            </div>
          </div>

          {/* Verification in progress */}
          {isVerifying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-xl"
            >
              <div className="text-center">
                <LoadingSpinner size="lg" className="mb-4" />
                <p className="text-gray-600">{t('verifyEmail.verifying')}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
