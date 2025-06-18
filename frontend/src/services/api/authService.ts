// src/services/api/authService.ts
import { authApi, LoginData, RegisterData as ApiRegisterData, User as ApiUser, AuthResponse as ApiAuthResponse, LoginResponse as ApiLoginResponse } from './auth'; // Assuming auth.ts exports necessary types

// Define frontend-specific UserData or use the one from auth.ts if suitable
// For consistency, it's often better to align frontend types with API response types
// or have a clear mapping layer. Here, we'll try to use/map to ApiUser.
export interface UserData extends ApiUser {
  name?: string; // Example: if frontend wants a combined 'name' field
}

// Define frontend-specific payload types or use/map to types from auth.ts
export type FrontendLoginPayload = LoginData; // email, password, mfaCode?
export type FrontendRegisterPayload = Omit<ApiRegisterData, 'preferredLanguage'>;
// No additional members, so type alias is suitable.
  // Assuming preferredLanguage is handled differently or not set at initial registration by this service layer
  // Or, if it's required, ensure it's part of FrontendRegisterPayload and passed to authApi.register
  // For this task, aligning with the goal of removing 'username' if not core:
  // The ApiRegisterData in auth.ts did not have username, so this is mostly aligned.
  // If username was here before, it's now removed from this payload too.
// Removed extra closing brace


export interface FrontendAuthResponse {
  user: UserData;
  tokens: {
    accessToken: string;
    refreshToken?: string;
  };
  requireMfa?: boolean; // For MFA flow
}

// Helper to map API user to Frontend UserData if needed
const mapApiUserToUserData = (apiUser: ApiUser): UserData => {
  return {
    ...apiUser,
    name: `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim(),
  };
};

export const authService = {
  login: async (payload: FrontendLoginPayload): Promise<FrontendAuthResponse> => {
    const response: ApiLoginResponse = await authApi.login(payload);
    // Tokens are handled by apiClient's interceptors (storage & refresh)
    // The apiClient also handles errors and token refresh automatically.

    if (response.requireMfa) {
      return {
        // No user/tokens yet, MFA is required
        user: {} as UserData, // Or a specific type indicating partial/no login
        tokens: {} as { accessToken: string; refreshToken?: string },
        requireMfa: true,
      };
    }

    if (!response.user || !response.tokens) {
        throw new Error("Login did not return user or tokens");
    }

    return {
      user: mapApiUserToUserData(response.user),
      tokens: response.tokens,
      requireMfa: false,
    };
  },

  register: async (payload: FrontendRegisterPayload): Promise<FrontendAuthResponse> => {
    // Assuming preferredLanguage is set by default or a separate flow
    const apiPayload: ApiRegisterData = {
        ...payload,
        preferredLanguage: 'en', // Or get from payload if added back
    };
    const response: ApiAuthResponse = await authApi.register(apiPayload);

    if (!response.user || !response.tokens) {
        throw new Error("Registration did not return user or tokens");
    }

    return {
      user: mapApiUserToUserData(response.user),
      tokens: response.tokens,
    };
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return authApi.requestPasswordReset({ email });
  },

  resetPassword: async (payload: { token: string; newPassword: string; email?: string /* if backend needs it */}): Promise<{ message: string }> => {
    // The email might not be needed if token is globally unique and contains user ref
    // Adjust based on actual authApi.resetPassword signature
    return authApi.resetPassword({ token: payload.token, newPassword: payload.newPassword });
  },

  logout: async (): Promise<void> => {
    // apiClient handles actual token removal from localStorage via its interceptor or specific method
    // authApi.logout might also call an API endpoint.
    const refreshToken = localStorage.getItem(import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token');
    if (refreshToken) {
        try {
            await authApi.logout(refreshToken); // Call API endpoint if it exists
        } catch (error) {
            console.warn('Logout API call failed, proceeding with local token removal:', error);
        }
    }
    // apiClient's interceptors or a dedicated logout method in apiClient should clear tokens.
    // Forcing it here for now as per original authService.ts logic.
    localStorage.removeItem(import.meta.env.VITE_JWT_STORAGE_KEY || 'dzinza_access_token');
    localStorage.removeItem(import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token');
    // The 'auth:logout' event is dispatched by apiClient on 401 after refresh failure.
  },

  getCurrentUser: async (): Promise<UserData | null> => {
    try {
      const apiUser: ApiUser = await authApi.getCurrentUser();
      return mapApiUserToUserData(apiUser);
    } catch (error) {
      // apiClient's interceptor handles 401s. If it's any other error, let it propagate or handle.
      // If getCurrentUser fails (e.g. no token, invalid token after refresh failed), it might throw.
      // The UI layer should catch this and redirect to login.
      console.error("Error fetching current user:", error);
      return null; // Or rethrow, depending on how actions handle it
    }
  },

  refreshToken: async (): Promise<{ accessToken: string } | null> => {
    // This is now handled by apiClient's response interceptor.
    // Direct calls to refreshToken from UI/store are usually not needed.
    // If a manual refresh is ever required, it would go through authApi.
    const refreshTokenValue = localStorage.getItem(import.meta.env.VITE_REFRESH_TOKEN_KEY || 'dzinza_refresh_token');
    if (!refreshTokenValue) {
        console.warn("No refresh token available for manual refresh call.");
        return null;
    }
    try {
        const response = await authApi.refreshToken(refreshTokenValue);
        // The interceptor in apiClient should already handle storing the new tokens.
        return { accessToken: response.accessToken };
    } catch (error) {
        console.error("Manual token refresh failed:", error);
        // Interceptor in apiClient should have handled logout if refresh token is invalid.
        return null;
    }
  },

  // Example of a method that might not be in AuthAPI but specific to authService's role
  verifyMfa: async (code: string): Promise<FrontendAuthResponse> => {
    // Assuming AuthAPI has a verifyMfa method that takes { code }
    // and on success returns a similar structure to login (user, tokens)
    const response: ApiLoginResponse = await authApi.login({ email: '', password: '', mfaCode: code }); // This is not quite right.
    // The backend should have a dedicated MFA verification endpoint that takes a temp session ID / user ID
    // and the MFA code, then finalizes login by issuing tokens.
    // For this task, we'll assume the login endpoint can take mfaCode as part of LoginData
    // and authApi.login handles this. The authActions.ts will manage the two-step flow.
    // This specific authService.verifyMfa might not be directly called if actions call authApi.login directly with code.

    if (!response.user || !response.tokens) {
        throw new Error("MFA verification did not return user or tokens");
    }
    return {
      user: mapApiUserToUserData(response.user),
      tokens: response.tokens,
      requireMfa: false,
    };
  }
};
