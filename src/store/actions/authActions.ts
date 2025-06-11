// src/store/actions/authActions.ts
import { Dispatch } from '@reduxjs/toolkit';
import { authService } from '../../services/api/authService';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  forgotPasswordStart,
  forgotPasswordSuccess,
  forgotPasswordFailure,
  resetPasswordStart,
  resetPasswordSuccess,
  resetPasswordFailure,
  fetchProfileStart,
  fetchProfileSuccess,
  fetchProfileFailure,
  refreshTokenSuccess,
  logout as logoutAction,
} from '../slices/authSlice';

// Login action
export const login = (identifier: string, password: string) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(loginStart());
      
      const response = await authService.login({ identifier, password });
      
      dispatch(loginSuccess({
        user: response.user,
        tokens: response.tokens,
      }));
      
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch(loginFailure(message));
      throw error;
    }
  };
};

// Register action
export const register = (userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(registerStart());
      
      const response = await authService.register(userData);
      
      dispatch(registerSuccess({
        user: response.user,
        tokens: response.tokens,
      }));
      
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      dispatch(registerFailure(message));
      throw error;
    }
  };
};

// Forgot password action
export const forgotPassword = (email: string) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(forgotPasswordStart());
      
      const response = await authService.forgotPassword({ email });
      
      dispatch(forgotPasswordSuccess(response.message));
      
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Forgot password failed';
      dispatch(forgotPasswordFailure(message));
      throw error;
    }
  };
};

// Reset password action
export const resetPassword = (token: string, email: string, newPassword: string) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(resetPasswordStart());
      
      const response = await authService.resetPassword({ token, email, newPassword });
      
      dispatch(resetPasswordSuccess(response.message));
      
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password reset failed';
      dispatch(resetPasswordFailure(message));
      throw error;
    }
  };
};

// Fetch current user profile
export const fetchCurrentUser = () => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(fetchProfileStart());
      
      const user = await authService.getCurrentUser();
      
      dispatch(fetchProfileSuccess(user));
      
      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch user profile';
      dispatch(fetchProfileFailure(message));
      throw error;
    }
  };
};

// Refresh access token
export const refreshAccessToken = () => {
  return async (dispatch: Dispatch) => {
    try {
      const response = await authService.refreshToken();
      
      dispatch(refreshTokenSuccess({ accessToken: response.accessToken }));
      
      return response;
    } catch (error) {
      // If refresh fails, logout the user
      dispatch(logout());
      throw error;
    }
  };
};

// Logout action
export const logout = () => {
  return async (dispatch: Dispatch) => {
    try {
      await authService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      dispatch(logoutAction());
    }
  };
};

// Check authentication status on app load
export const checkAuthStatus = () => {
  return async (dispatch: Dispatch) => {
    try {
      const token = localStorage.getItem(
        import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token'
      );
      
      if (!token) {
        return false;
      }
      
      // Try to fetch current user to validate token
      const user = await authService.getCurrentUser();
      
      dispatch(fetchProfileSuccess(user));
      
      return true;
    } catch (error) {
      // Token is invalid, try to refresh
      try {
        await dispatch(refreshAccessToken());
        const user = await authService.getCurrentUser();
        dispatch(fetchProfileSuccess(user));
        return true;
      } catch (refreshError) {
        // Both token and refresh failed, logout
        dispatch(logout());
        return false;
      }
    }
  };
};
