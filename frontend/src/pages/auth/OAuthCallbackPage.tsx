import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/ui/LoadingSpinner'; // Assuming path
import Alert from '../../components/ui/Alert'; // Assuming path

type OAuthProvider = 'google' | 'facebook';

const OAuthCallbackPage: React.FC = () => {
  const { provider: rawProvider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { processOAuthCallback, isLoading: authIsLoading, error: authError } = useAuth();

  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [provider, setProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null); // Local error for parameter issues

  useEffect(() => {
    const p = rawProvider as OAuthProvider;
    if (p !== 'google' && p !== 'facebook') {
      setError(`Invalid OAuth provider specified: ${rawProvider}. Please try logging in again.`);
      return;
    }
    setProvider(p);

    const c = searchParams.get('code');
    const s = searchParams.get('state');

    if (!c) {
      setError('Authorization code is missing from the callback. Please try logging in again.');
      return;
    }
    if (!s) {
      setError('State parameter is missing from the callback. Please try logging in again.');
      return;
    }
    setCode(c);
    setState(s);
  }, [rawProvider, searchParams]);

  useEffect(() => {
    if (provider && code && state) {
      processOAuthCallback(provider, code, state)
        .then(() => {
          // Only navigate if there was no error during processOAuthCallback
          if (!authError) { // Check authError directly from context after call
            navigate('/dashboard');
          }
        })
        .catch((err) => {
          // Error is already set in useAuth hook, and rethrown.
          // No need to setError(err.message) here as authError will be populated.
          console.error('OAuth callback processing failed:', err);
        });
    }
  }, [provider, code, state, processOAuthCallback, navigate, authError]); // Added authError to dependencies

  if (authIsLoading || (!error && !authError && (!code || !state || !provider))) {
    // Show loading spinner if auth is loading OR if params are still being processed (and no error yet)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <LoadingSpinner />
        <p className="mt-4 text-lg text-gray-700">Processing your login...</p>
      </div>
    );
  }

  const displayError = error || authError; // Prioritize local errors (param issues) then auth errors

  if (displayError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert type="error" title="Login Failed">
          <p>{displayError}</p>
          <p className="mt-2">
            Please <Link to="/auth/login" className="text-blue-600 hover:underline">try logging in</Link> again.
          </p>
        </Alert>
      </div>
    );
  }

  // Fallback, though ideally navigate('/dashboard') or error state should be met.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <p>Completing login...</p>
    </div>
  );
};

export default OAuthCallbackPage;
