import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui'; // Adjust path
import { Header, Footer } from '../../components/layout'; // Adjust path

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { token } = useParams<{ token: string }>(); // Assuming token is in URL
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match!"); // Replace with better error handling
      return;
    }
    // TODO: Implement reset password logic
    console.log('Reset password attempt with token:', token, 'and new password');
    alert('Your password has been reset successfully!');
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <Card title="Reset your password">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="New Password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Button type="submit" className="w-full" variant="primary">
                Reset Password
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-600">
              Remembered your password?{' '}
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
export default ResetPasswordPage;
