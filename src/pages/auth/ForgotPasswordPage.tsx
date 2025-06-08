import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui';
import { Header, Footer } from '../../components/layout';
import { useDispatch, useSelector } from 'react-redux'; // Import hooks
import { AppDispatch, RootState } from '../../store/store'; // Import types
import { authService } from '../../services/api/authService'; // Import service
import { forgotPasswordStart, forgotPasswordSuccess, forgotPasswordFailure } from '../../store/slices/authSlice'; // Import actions

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const dispatch: AppDispatch = useDispatch();

  const { forgotPasswordStatus, forgotPasswordError, forgotPasswordMessage } = useSelector(
    (state: RootState) => state.auth
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(forgotPasswordStart());
    try {
      const response = await authService.forgotPassword(email);
      dispatch(forgotPasswordSuccess(response.message));
    } catch (err: any) {
      dispatch(forgotPasswordFailure(err.message || 'Failed to send reset link. Please try again.'));
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <Card title="Forgot your password?">
            {forgotPasswordStatus === 'succeeded' && forgotPasswordMessage ? (
              <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
                {forgotPasswordMessage}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <Input
                    label="Email address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={forgotPasswordStatus === 'loading'}
                  />
                  {forgotPasswordStatus === 'failed' && forgotPasswordError && (
                    <p className="text-xs text-red-600">{forgotPasswordError}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    variant="primary"
                    disabled={forgotPasswordStatus === 'loading'}
                  >
                    {forgotPasswordStatus === 'loading' ? 'Sending link...' : 'Send reset link'}
                  </Button>
                </form>
              </>
            )}
            <p className="mt-6 text-center text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};
export default ForgotPasswordPage;
