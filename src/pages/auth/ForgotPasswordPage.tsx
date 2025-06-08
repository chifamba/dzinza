import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui'; // Adjust path
import { Header, Footer } from '../../components/layout'; // Adjust path

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement forgot password logic
    console.log('Forgot password attempt for:', email);
    alert('If an account exists for this email, a password reset link has been sent.');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <Card title="Forgot your password?">
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
              />
              <Button type="submit" className="w-full" variant="primary">
                Send reset link
              </Button>
            </form>
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
