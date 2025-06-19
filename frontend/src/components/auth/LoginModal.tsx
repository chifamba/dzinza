import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Modal, Button, Input } from '../ui';
import { loginStart, loginSuccess, loginFailure } from '../../store/slices/authSlice';
import { authService } from '../../services/api/authService';
import { AppDispatch, RootState } from '../../store/store';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();

  const { status, error } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginStart());
    
    try {
      const response = await authService.login({ email, password });
      dispatch(loginSuccess(response));
      
      // Close modal and navigate to dashboard on success
      onClose();
      navigate('/dashboard');
      
      // Reset form
      setEmail('');
      setPassword('');
    } catch (err: unknown) {
      let message = 'Failed to login';
      
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          message = axiosError.response.data.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      
      dispatch(loginFailure(message));
      
      // If login fails completely, redirect to login page
      if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('credentials')) {
        setTimeout(() => {
          onClose();
          navigate('/login');
        }, 2000); // Show error for 2 seconds then redirect
      }
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setEmail('');
    setPassword('');
    onClose();
  };

  const handleModalClose = () => {
    // Only close if not loading
    if (status !== 'loading') {
      handleClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Login to your account"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@dzinza.org"
          disabled={status === 'loading'}
        />
        
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          disabled={status === 'loading'}
        />
        
        {error && status === 'failed' && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
            {error.toLowerCase().includes('invalid') && (
              <div className="mt-1 text-xs">
                Redirecting to login page...
              </div>
            )}
          </div>
        )}
        
        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
            disabled={status === 'loading'}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
        
        <div className="text-center text-sm text-gray-600 pt-2">
          <button
            type="button"
            onClick={() => {
              handleClose();
              navigate('/forgot-password');
            }}
            className="text-blue-600 hover:text-blue-500 underline"
            disabled={status === 'loading'}
          >
            Forgot your password?
          </button>
        </div>
        
        <div className="text-center text-sm text-gray-600 border-t pt-4">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => {
              handleClose();
              navigate('/register');
            }}
            className="text-blue-600 hover:text-blue-500 underline font-medium"
            disabled={status === 'loading'}
          >
            Sign up
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default LoginModal;
