// src/services/api/authService.ts

// Ensure this UserData interface is consistent with authSlice.ts
export interface UserData {
  id: string;
  name?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImageUrl?: string;
  emailVerified?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

interface LoginPayload {
  identifier: string; // email or username
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}

interface AuthResponse {
  user: UserData;
  tokens: {
    accessToken: string;
    refreshToken?: string;
  };
}

interface ForgotPasswordPayload {
  email: string;
}

interface ResetPasswordPayload {
  token: string;
  email: string;
  newPassword: string;
}

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data?.error) {
    return new Error(error.response.data.error);
  }
  if (error.response?.data?.message) {
    return new Error(error.response.data.message);
  }
  if (error.message) {
    return new Error(error.message);
  }
  return new Error('An unexpected error occurred');
};

// Helper function to make API requests
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Add auth token if available
  const token = localStorage.getItem(import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token');
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        response: {
          status: response.status,
          data: errorData
        }
      };
    }

    return response.json();
  } catch (error) {
    throw error;
  }
};

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Store tokens
      if (response.tokens?.accessToken) {
        localStorage.setItem(
          import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token',
          response.tokens.accessToken
        );
      }
      if (response.tokens?.refreshToken) {
        localStorage.setItem(
          import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token',
          response.tokens.refreshToken
        );
      }

      return {
        user: {
          id: response.user.id,
          name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim(),
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          username: response.user.username,
          emailVerified: response.user.emailVerified,
          createdAt: response.user.createdAt,
          lastLogin: response.user.lastLogin,
        },
        tokens: response.tokens,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    try {
      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Store tokens
      if (response.tokens?.accessToken) {
        localStorage.setItem(
          import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token',
          response.tokens.accessToken
        );
      }
      if (response.tokens?.refreshToken) {
        localStorage.setItem(
          import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token',
          response.tokens.refreshToken
        );
      }

      return {
        user: {
          id: response.user.id,
          name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim(),
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          username: response.user.username,
          emailVerified: response.user.emailVerified,
          createdAt: response.user.createdAt,
        },
        tokens: response.tokens,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  forgotPassword: async (payload: ForgotPasswordPayload): Promise<{ message: string }> => {
    try {
      const response = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return { message: response.message };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ message: string }> => {
    try {
      const response = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return { message: response.message };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  logout: async (): Promise<void> => {
    try {
      // Call logout endpoint
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear stored tokens
      localStorage.removeItem(import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token');
      localStorage.removeItem(import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token');
    }
  },

  getCurrentUser: async (): Promise<UserData> => {
    try {
      const response = await apiRequest('/auth/me');

      return {
        id: response.user.id,
        name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim(),
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        username: response.user.username,
        profileImageUrl: response.user.profilePictureUrl,
        emailVerified: response.user.emailVerified,
        createdAt: response.user.createdAt,
        lastLogin: response.user.lastLogin,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  refreshToken: async (): Promise<{ accessToken: string }> => {
    try {
      const refreshToken = localStorage.getItem(
        import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token'
      );

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      // Store new access token
      if (response.tokens?.accessToken) {
        localStorage.setItem(
          import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token',
          response.tokens.accessToken
        );
      }

      return { accessToken: response.tokens.accessToken };
    } catch (error) {
      // Clear tokens if refresh fails
      localStorage.removeItem(import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token');
      localStorage.removeItem(import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token');
      throw handleApiError(error);
    }
  },

  // Legacy methods for backward compatibility
  getUserProfile: async (_userId: string): Promise<UserData> => {
    return authService.getCurrentUser();
  },

  updateUserProfile: async (_userId: string, _data: Partial<UserData>): Promise<UserData> => {
    // This would be implemented when we add profile update endpoints
    throw new Error('Profile update not yet implemented');
  }
};
