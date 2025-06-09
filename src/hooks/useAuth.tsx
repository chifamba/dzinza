import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { authApi, AuthResponse, RegisterData, LoginResponse } from '../services/api/auth';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  preferredLanguage: 'en' | 'sn' | 'nd';
  emailVerified: boolean;
  roles: string[];
  profilePhoto?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, mfaCode?: string) => Promise<LoginResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'facebook') => Promise<void>;
  processOAuthCallback: (provider: 'google' | 'facebook', code: string, state: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessTokenKey = import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token';
        const token = localStorage.getItem(accessTokenKey);
        if (token) {
          // Verify token and get user info
          const userInfo = await authApi.getCurrentUser();
          setUser(userInfo);
        }
      } catch (err) {
        // Token might be expired, try to refresh
        try {
          await refreshToken();
        } catch (refreshErr) {
          // Refresh failed, clear tokens
          const accessTokenKey = import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token';
          const refreshTokenKey = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token';
          localStorage.removeItem(accessTokenKey);
          localStorage.removeItem(refreshTokenKey);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string, mfaCode?: string): Promise<LoginResponse> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authApi.login({ email, password, mfaCode });
      
      if (response.requireMfa) {
        return response;
      }
      
      if (response.tokens) {
        const accessTokenKey = import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token';
        const refreshTokenKey = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token';
        localStorage.setItem(accessTokenKey, response.tokens.accessToken);
        localStorage.setItem(refreshTokenKey, response.tokens.refreshToken);
        setUser(response.user || null);
      }
      
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authApi.register(data);
      
      if (response.tokens) {
        const accessTokenKey = import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token';
        const refreshTokenKey = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token';
        localStorage.setItem(accessTokenKey, response.tokens.accessToken);
        localStorage.setItem(refreshTokenKey, response.tokens.refreshToken);
        setUser(response.user);
      }
      
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const refreshTokenKey = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token';
      const refreshToken = localStorage.getItem(refreshTokenKey);
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      // Logout error is not critical
      console.error('Logout error:', err);
    } finally {
      // Clear local state regardless of API call result
      const accessTokenKey = import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token';
      const refreshTokenKey = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token';
      localStorage.removeItem(accessTokenKey);
      localStorage.removeItem(refreshTokenKey);
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const refreshTokenKey = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token';
      const refreshTokenValue = localStorage.getItem(refreshTokenKey);
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }
      
      const response = await authApi.refreshToken(refreshTokenValue);
      
      const accessTokenKey = import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token';
      localStorage.setItem(accessTokenKey, response.accessToken);
      localStorage.setItem(refreshTokenKey, response.refreshToken);
      
      // Get updated user info
      const userInfo = await authApi.getCurrentUser();
      setUser(userInfo);
    } catch (err) {
      // Refresh failed, clear tokens
      const accessTokenKey = import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token';
      const refreshTokenKey = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token';
      localStorage.removeItem(accessTokenKey);
      localStorage.removeItem(refreshTokenKey);
      setUser(null);
      throw err;
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedUser = await authApi.updateProfile(data);
      setUser(updatedUser);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Profile update failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const signInWithProvider = async (provider: 'google' | 'facebook'): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authApi.initiateOAuth(provider);
      if (response.authUrl) {
        window.location.href = response.authUrl;
      } else {
        throw new Error('No authUrl received from backend');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || `OAuth initiation with ${provider} failed`;
      setError(errorMessage);
      // No need to rethrow here as the redirection will handle the flow or error page
    } finally {
      // Note: setIsLoading(false) might not be reached if redirection happens.
      // This is generally fine as the page will reload.
      // If redirection fails, it's important to set loading to false.
      // However, if authUrl is missing, the catch block handles it.
      // If window.location.href succeeds, the current JS context is lost.
      // For now, we'll keep it simple. If issues arise, this could be revisited.
      // One way to ensure it's set is if the API call itself fails before redirection.
      if (!window.location.href.includes('provider_redirect_happened_or_failed')) { // Pseudo-check
          setIsLoading(false);
      }
    }
  };

  const processOAuthCallback = async (provider: 'google' | 'facebook', code: string, state: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authApi.handleOAuthCallback(provider, code, state);

      if (response.tokens && response.user) {
        const accessTokenKey = import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token';
        const refreshTokenKey = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token';
        localStorage.setItem(accessTokenKey, response.tokens.accessToken);
        localStorage.setItem(refreshTokenKey, response.tokens.refreshToken);
        setUser(response.user);
      } else {
        // This case should ideally be an error from handleOAuthCallback
        throw new Error('OAuth callback did not return tokens or user');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'OAuth callback processing failed';
      setError(errorMessage);
      throw err; // Rethrow to allow the calling page (e.g., callback page) to handle it
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    refreshToken,
    updateProfile,
    signInWithProvider,
    processOAuthCallback
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
