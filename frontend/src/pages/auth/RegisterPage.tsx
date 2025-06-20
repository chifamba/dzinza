import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui';
import { Header, Footer } from '../../components/layout';
import { useDispatch, useSelector } from 'react-redux';
import { registerStart, registerSuccess, registerFailure } from '../../store/slices/authSlice';
import { authService } from '../../services/api/authService';
import { AppDispatch, RootState } from '../../store/store';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();

  const { status, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

 useEffect(() => {
    // If registration implies immediate login and isAuthenticated becomes true
    if (isAuthenticated) {
      navigate('/family-tree');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      dispatch(registerFailure("Passwords don't match!"));
      return;
    }
    dispatch(registerStart());
    try {
      const response = await authService.register({ name, email, password });
      dispatch(registerSuccess(response));
      // Decide navigation: to login for email verification, or dashboard if auto-login
      navigate('/login');
      // alert('Registration successful! Please check your email to verify your account.'); // Or navigate to dashboard if auto-login
    } catch (err: unknown) {
      let message = 'Failed to register'; // Default
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          message = axiosError.response.data.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      dispatch(registerFailure(message));
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <Card title="Create your account">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="Full Name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                disabled={status === 'loading'}
              />
              <Input
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={status === 'loading'}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={status === 'loading'}
              />
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={status === 'loading'}
              />
              {error && status === 'failed' && (
                <p className="text-xs text-red-600">{error}</p>
              )}
              <Button type="submit" className="w-full" variant="primary" disabled={status === 'loading'}>
                {status === 'loading' ? 'Signing up...' : 'Sign up'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-600">
              Already a member?{' '}
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
export default RegisterPage;
