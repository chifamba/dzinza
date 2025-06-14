import axios, { AxiosResponse } from 'axios';
import { apiClient } from './client';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  preferredLanguage: 'en' | 'sn' | 'nd';
}

export interface LoginData {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  preferredLanguage: 'en' | 'sn' | 'nd';
  emailVerified: boolean;
  roles: string[];
  profilePhoto?: string;
  dateOfBirth?: string;
  isActive: boolean;
  mfaEnabled: boolean;
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      newsletter: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'family' | 'private';
      allowMessages: boolean;
      showOnlineStatus: boolean;
    };
    theme: 'light' | 'dark' | 'auto';
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface LoginResponse {
  message: string;
  user?: User;
  tokens?: AuthTokens;
  requireMfa?: boolean;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordResetData {
  email: string;
}

export interface PasswordResetConfirmData {
  token: string;
  newPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  preferredLanguage?: 'en' | 'sn' | 'nd';
  preferences?: Partial<User['preferences']>;
}

export interface EmailVerificationData {
  token: string;
}

export interface MfaSetupResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface MfaVerifyData {
  code: string;
}

class AuthAPI {
  private baseURL = '/api/auth';

  async register(data: RegisterData): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await apiClient.post(
      `${this.baseURL}/register`,
      data
    );
    return response.data;
  }

  async login(data: LoginData): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await apiClient.post(
      `${this.baseURL}/login`,
      data
    );
    return response.data;
  }

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post(`${this.baseURL}/logout`, { refreshToken });
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response: AxiosResponse<RefreshTokenResponse> = await apiClient.post(
      `${this.baseURL}/refresh`,
      { refreshToken }
    );
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<{ user: User }> = await apiClient.get(
      `${this.baseURL}/me`
    );
    return response.data.user;
  }

  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response: AxiosResponse<{ user: User }> = await apiClient.patch(
      `${this.baseURL}/profile`,
      data
    );
    return response.data.user;
  }

  async verifyEmail(data: EmailVerificationData): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post(
      `${this.baseURL}/verify-email`,
      data
    );
    return response.data;
  }

  async resendVerificationEmail(): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post(
      `${this.baseURL}/resend-verification`
    );
    return response.data;
  }

  async requestPasswordReset(data: PasswordResetData): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post(
      `${this.baseURL}/forgot-password`,
      data
    );
    return response.data;
  }

  async resetPassword(data: PasswordResetConfirmData): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post(
      `${this.baseURL}/reset-password`,
      data
    );
    return response.data;
  }

  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post(
      `${this.baseURL}/change-password`,
      data
    );
    return response.data;
  }

  // Multi-Factor Authentication
  async setupMfa(): Promise<MfaSetupResponse> {
    const response: AxiosResponse<MfaSetupResponse> = await apiClient.post(
      `${this.baseURL}/mfa/setup`
    );
    return response.data;
  }

  async verifyMfa(data: MfaVerifyData): Promise<{ message: string; backupCodes: string[] }> {
    const response: AxiosResponse<{ message: string; backupCodes: string[] }> = await apiClient.post(
      `${this.baseURL}/mfa/verify`,
      data
    );
    return response.data;
  }

  async disableMfa(data: MfaVerifyData): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post(
      `${this.baseURL}/mfa/disable`,
      data
    );
    return response.data;
  }

  async regenerateBackupCodes(): Promise<{ backupCodes: string[] }> {
    const response: AxiosResponse<{ backupCodes: string[] }> = await apiClient.post(
      `${this.baseURL}/mfa/backup-codes/regenerate`
    );
    return response.data;
  }

  // Account Management
  async deactivateAccount(password: string): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.post(
      `${this.baseURL}/deactivate`,
      { password }
    );
    return response.data;
  }

  async exportData(): Promise<Blob> {
    const response: AxiosResponse<Blob> = await apiClient.get(
      `${this.baseURL}/export-data`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  // Social Authentication
  async initiateOAuth(provider: 'google' | 'facebook'): Promise<{ authUrl: string }> {
    const response: AxiosResponse<{ authUrl: string }> = await apiClient.get(
      `${this.baseURL}/oauth/${provider}`
    );
    return response.data;
  }

  async handleOAuthCallback(
    provider: 'google' | 'facebook',
    code: string,
    state: string
  ): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await apiClient.post(
      `${this.baseURL}/oauth/${provider}/callback`,
      { code, state }
    );
    return response.data;
  }

  async uploadAvatar(file: File): Promise<User> {
    // The `apiClient.uploadFile` method expects the URL, the file, and optional additional data.
    // The URL should be the specific avatar upload endpoint, e.g., `/api/auth/profile/avatar`.
    // The third argument to uploadFile is 'additionalData', not directly for a field name like 'avatar'.
    // apiClient.uploadFile internally appends the file with a key 'file'.
    // If backend expects a different field name, apiClient.post with FormData might be more direct.
    // Assuming backend consuming /api/auth/profile/avatar expects the file under field name 'avatar':
    const formData = new FormData();
    formData.append('avatar', file); // Ensure backend expects 'avatar'

    const response: AxiosResponse<{ user: User }> = await apiClient.post( // Using .post for explicit field name
      `${this.baseURL}/profile/avatar`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.user; // Assuming backend returns { user: User }
  }
}

export const authApi = new AuthAPI();
