import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
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
        const token = localStorage.getItem('accessToken');
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
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
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
        localStorage.setItem('accessToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);
        setUser(response.user);
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
        localStorage.setItem('accessToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);
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
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      // Logout error is not critical
      console.error('Logout error:', err);
    } finally {
      // Clear local state regardless of API call result
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }
      
      const response = await authApi.refreshToken(refreshTokenValue);
      
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Get updated user info
      const userInfo = await authApi.getCurrentUser();
      setUser(userInfo);
    } catch (err) {
      // Refresh failed, clear tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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
    updateProfile
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
