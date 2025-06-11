// src/hooks/useAuth.ts
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { 
  login as loginAction,
  register as registerAction,
  logout as logoutAction,
  forgotPassword as forgotPasswordAction,
  resetPassword as resetPasswordAction,
  fetchCurrentUser,
  checkAuthStatus,
} from '../store/actions/authActions';

export const useAuth = () => {
  const dispatch = useDispatch();
  
  const {
    isAuthenticated,
    user,
    accessToken,
    status,
    error,
    forgotPasswordStatus,
    forgotPasswordError,
    forgotPasswordMessage,
    resetPasswordStatus,
    resetPasswordError,
    resetPasswordMessage,
    profileStatus,
    profileError,
  } = useSelector((state: RootState) => state.auth);

  // Auth actions
  const login = async (identifier: string, password: string) => {
    return dispatch(loginAction(identifier, password) as any);
  };

  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
  }) => {
    return dispatch(registerAction(userData) as any);
  };

  const logout = async () => {
    return dispatch(logoutAction() as any);
  };

  const forgotPassword = async (email: string) => {
    return dispatch(forgotPasswordAction(email) as any);
  };

  const resetPassword = async (token: string, email: string, newPassword: string) => {
    return dispatch(resetPasswordAction(token, email, newPassword) as any);
  };

  const getCurrentUser = async () => {
    return dispatch(fetchCurrentUser() as any);
  };

  const initializeAuth = async () => {
    return dispatch(checkAuthStatus() as any);
  };

  // Computed values
  const isLoading = status === 'loading' || profileStatus === 'loading';
  const isForgotPasswordLoading = forgotPasswordStatus === 'loading';
  const isResetPasswordLoading = resetPasswordStatus === 'loading';

  return {
    // State
    isAuthenticated,
    user,
    accessToken,
    isLoading,
    error,
    
    // Forgot password state
    isForgotPasswordLoading,
    forgotPasswordError,
    forgotPasswordMessage,
    forgotPasswordStatus,
    
    // Reset password state
    isResetPasswordLoading,
    resetPasswordError,
    resetPasswordMessage,
    resetPasswordStatus,
    
    // Profile state
    profileStatus,
    profileError,
    
    // Actions
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    getCurrentUser,
    initializeAuth,
  };
};
