import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui';
import { Header, Footer } from '../../components/layout';
import { useDispatch, useSelector } from 'react-redux'; // Import hooks
import { AppDispatch, RootState } from '../../store/store'; // Import types
import { authService } from '../../services/api/authService'; // Import service
import { resetPasswordStart, resetPasswordSuccess, resetPasswordFailure } from '../../store/slices/authSlice'; // Import actions

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();

  const { resetPasswordStatus, resetPasswordError, resetPasswordMessage } = useSelector(
    (state: RootState) => state.auth
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      dispatch(resetPasswordFailure('No reset token provided.'));
      return;
    }
    if (password !== confirmPassword) {
      dispatch(resetPasswordFailure("Passwords don't match!"));
      return;
    }
    dispatch(resetPasswordStart());
    try {
      const response = await authService.resetPassword(token, password);
      dispatch(resetPasswordSuccess(response.message));
      // Optional: Show message for a few seconds before navigating
      setTimeout(() => {
        navigate('/login');
      }, 3000); // Navigate to login after 3 seconds
    } catch (err: any) {
      dispatch(resetPasswordFailure(err.message || 'Failed to reset password. Please try again.'));
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <Card title="Reset your password">
            {resetPasswordStatus === 'succeeded' && resetPasswordMessage ? (
              <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
                {resetPasswordMessage} Redirecting to login...
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <Input
                  label="New Password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={resetPasswordStatus === 'loading'}
                />
                <Input
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={resetPasswordStatus === 'loading'}
                />
                {resetPasswordStatus === 'failed' && resetPasswordError && (
                  <p className="text-xs text-red-600">{resetPasswordError}</p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  variant="primary"
                  disabled={resetPasswordStatus === 'loading'}
                >
                  {resetPasswordStatus === 'loading' ? 'Resetting password...' : 'Reset Password'}
                </Button>
              </form>
            )}
            {resetPasswordStatus !== 'succeeded' && (
              <p className="mt-6 text-center text-sm text-gray-600">
                Remembered your password?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};
export default ResetPasswordPage;
