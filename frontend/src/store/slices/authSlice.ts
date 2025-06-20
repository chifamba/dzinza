import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Updated UserData interface to match authService
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

interface LoginSuccessPayload {
  user: UserData;
  tokens: {
    accessToken: string;
    refreshToken?: string;
  };
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserData | null; // This will hold the logged-in user's profile
  accessToken: string | null;
  refreshToken: string | null;
  status: "idle" | "loading" | "succeeded" | "failed"; // For login/register
  error: string | null; // For login/register

  forgotPasswordStatus: "idle" | "loading" | "succeeded" | "failed";
  forgotPasswordError: string | null;
  forgotPasswordMessage: string | null;

  resetPasswordStatus: "idle" | "loading" | "succeeded" | "failed";
  resetPasswordError: string | null;
  resetPasswordMessage: string | null;

  // New fields for profile management
  profileStatus: "idle" | "loading" | "succeeded" | "failed";
  profileError: string | null;

  // MFA specific state
  mfaRequired: boolean;
  tempMfaData: { emailForMfa: string } | null; // Store email or other temp data needed for MFA step
}

// Initialize state from localStorage if available
const getInitialAuthState = (): AuthState => {
  const tokenKey =
    import.meta.env.VITE_JWT_STORAGE_KEY || "dzinza_access_token";
  const refreshTokenKey =
    import.meta.env.VITE_REFRESH_TOKEN_KEY || "dzinza_refresh_token";

  const accessToken = localStorage.getItem(tokenKey);
  const refreshToken = localStorage.getItem(refreshTokenKey);

  return {
    isAuthenticated: !!accessToken, // If token exists, consider authenticated
    user: null, // Will be fetched on app start if authenticated
    accessToken,
    refreshToken,
    status: "idle",
    error: null,

    forgotPasswordStatus: "idle",
    forgotPasswordError: null,
    forgotPasswordMessage: null,

    resetPasswordStatus: "idle",
    resetPasswordError: null,
    resetPasswordMessage: null,

    profileStatus: "idle",
    profileError: null,

    mfaRequired: false,
    tempMfaData: null,
  };
};

const initialState: AuthState = getInitialAuthState();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart(state) {
      state.status = "loading";
      state.error = null;
      state.profileStatus = "idle"; // Reset profile status on new login attempt
      state.profileError = null;
      state.mfaRequired = false; // Reset MFA flag on new login attempt
      state.tempMfaData = null;
    },
    loginSuccess(state, action: PayloadAction<LoginSuccessPayload>) {
      state.status = "succeeded";
      state.isAuthenticated = true;
      state.user = action.payload.user; // User profile is set here
      state.accessToken = action.payload.tokens.accessToken;
      state.refreshToken = action.payload.tokens.refreshToken || null;
      state.profileStatus = "succeeded"; // Profile is implicitly fetched on login
      state.mfaRequired = false; // Clear MFA flag on successful login
      state.tempMfaData = null;

      // Store tokens in localStorage for API client
      const tokenKey =
        import.meta.env.VITE_JWT_STORAGE_KEY || "dzinza_access_token";
      const refreshTokenKey =
        import.meta.env.VITE_REFRESH_TOKEN_KEY || "dzinza_refresh_token";

      localStorage.setItem(tokenKey, action.payload.tokens.accessToken);
      if (action.payload.tokens.refreshToken) {
        localStorage.setItem(
          refreshTokenKey,
          action.payload.tokens.refreshToken
        );
      }
    },
    loginMfaRequired(state, action: PayloadAction<{ emailForMfa: string }>) {
      state.status = "succeeded"; // Or a new status like 'mfaPending'
      state.isAuthenticated = false; // Not fully authenticated yet
      state.mfaRequired = true;
      state.tempMfaData = action.payload; // Store data needed for MFA submission step
      state.user = null; // No user data until MFA is complete
      state.accessToken = null;
      state.refreshToken = null;
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.status = "failed";
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = action.payload;
      state.mfaRequired = false; // Clear MFA flag on failure
      state.tempMfaData = null;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = "idle";
      state.error = null;

      // Clear tokens from localStorage
      const tokenKey =
        import.meta.env.VITE_JWT_STORAGE_KEY || "dzinza_access_token";
      const refreshTokenKey =
        import.meta.env.VITE_REFRESH_TOKEN_KEY || "dzinza_refresh_token";

      localStorage.removeItem(tokenKey);
      localStorage.removeItem(refreshTokenKey);

      // Reset other auth-related state
      state.forgotPasswordStatus = "idle";
      state.forgotPasswordError = null;
      state.forgotPasswordMessage = null;
      state.resetPasswordStatus = "idle";
      state.resetPasswordError = null;
      state.resetPasswordMessage = null;
      state.profileStatus = "idle";
      state.profileError = null;
      state.mfaRequired = false;
      state.tempMfaData = null;
    },
    registerStart(state) {
      state.status = "loading";
      state.error = null;
      state.mfaRequired = false; // Reset MFA flag
      state.tempMfaData = null;
    },
    // Assuming registerSuccess might also log the user in or provide user data
    registerSuccess(state, action: PayloadAction<LoginSuccessPayload>) {
      state.status = "succeeded";
      // Registration also logs in the user
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.tokens.accessToken;
      state.refreshToken = action.payload.tokens.refreshToken || null;
      state.profileStatus = "succeeded";
      state.mfaRequired = false; // Clear MFA flag
      state.tempMfaData = null;
    },
    registerFailure(state, action: PayloadAction<string>) {
      state.status = "failed";
      state.error = action.payload;
    },
    forgotPasswordStart(state) {
      state.forgotPasswordStatus = "loading";
      state.forgotPasswordError = null;
      state.forgotPasswordMessage = null;
    },
    forgotPasswordSuccess(state, action: PayloadAction<string>) {
      state.forgotPasswordStatus = "succeeded";
      state.forgotPasswordMessage = action.payload;
    },
    forgotPasswordFailure(state, action: PayloadAction<string>) {
      state.forgotPasswordStatus = "failed";
      state.forgotPasswordError = action.payload;
    },
    resetPasswordStart(state) {
      state.resetPasswordStatus = "loading";
      state.resetPasswordError = null;
      state.resetPasswordMessage = null;
    },
    resetPasswordSuccess(state, action: PayloadAction<string>) {
      state.resetPasswordStatus = "succeeded";
      state.resetPasswordMessage = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = "idle";
      state.error = null;
    },
    resetPasswordFailure(state, action: PayloadAction<string>) {
      state.resetPasswordStatus = "failed";
      state.resetPasswordError = action.payload;
    },

    // New reducers for profile management
    fetchProfileStart(state) {
      state.profileStatus = "loading";
      state.profileError = null;
    },
    fetchProfileSuccess(state, action: PayloadAction<UserData>) {
      state.profileStatus = "succeeded";
      state.user = action.payload; // Update user profile in state
    },
    fetchProfileFailure(state, action: PayloadAction<string>) {
      state.profileStatus = "failed";
      state.profileError = action.payload;
    },
    updateProfileStart(state) {
      state.profileStatus = "loading";
      state.profileError = null;
    },
    updateProfileSuccess(state, action: PayloadAction<UserData>) {
      state.profileStatus = "succeeded";
      state.user = action.payload; // Update user profile in state
    },
    updateProfileFailure(state, action: PayloadAction<string>) {
      state.profileStatus = "failed";
      state.profileError = action.payload;
    },

    // Token refresh action
    refreshTokenSuccess(state, action: PayloadAction<{ accessToken: string }>) {
      state.accessToken = action.payload.accessToken;
    },
  },
});
export const {
  loginStart,
  loginSuccess,
  loginFailure,
  loginMfaRequired,
  logout,
  registerStart,
  registerSuccess,
  registerFailure,
  forgotPasswordStart,
  forgotPasswordSuccess,
  forgotPasswordFailure,
  resetPasswordStart,
  resetPasswordSuccess,
  resetPasswordFailure,
  // Export new profile actions
  fetchProfileStart,
  fetchProfileSuccess,
  fetchProfileFailure,
  updateProfileStart,
  updateProfileSuccess,
  updateProfileFailure,
  refreshTokenSuccess,
} = authSlice.actions;

export default authSlice.reducer;
