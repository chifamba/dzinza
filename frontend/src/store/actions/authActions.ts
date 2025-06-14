// src/store/actions/authActions.ts
import { Dispatch } from '@reduxjs/toolkit';
import { authService } from '../../services/api/authService';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  loginMfaRequired, // Import the new action
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
export const login = (email: string, password: string, mfaCode?: string) => { // Changed identifier to email, added mfaCode
  return async (dispatch: Dispatch) => {
    try {
      dispatch(loginStart());
      
      // Pass email, password, and mfaCode to authService.login
      // authService.login payload (FrontendLoginPayload) expects: email, password, mfaCode?
      const response = await authService.login({ email, password, mfaCode });

      // MFA handling will be added here in the next step.
      // MFA handling
      if (response.requireMfa) {
        // Dispatch action to indicate MFA is required.
        // Store email used for this login attempt, so MFA form can prefill or use it.
        dispatch(loginMfaRequired({ emailForMfa: email }));
      } else if (response.user && response.tokens) {
        // If no MFA is required and login is successful (user and tokens are present)
        dispatch(loginSuccess({
          user: response.user,
          tokens: response.tokens,
        }));
      } else {
        // This case should ideally not be reached if API guarantees user/tokens or requireMfa
        throw new Error('Login response incomplete.');
      }
      
      return response; // Return the full response for UI to handle MFA or success
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch(loginFailure(message));
      throw error;
    }
  };
};

// Register action
export const register = (userData: { // Removed username from parameter type
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  // preferredLanguage?: 'en' | 'sn' | 'nd'; // Optional: can be added if UI supports it
}) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(registerStart());
      
      // userData for authService.register (FrontendRegisterPayload) expects: email, password, firstName, lastName
      // It internally adds preferredLanguage: 'en' for now.
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
