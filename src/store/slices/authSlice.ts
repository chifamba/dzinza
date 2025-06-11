import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  status: 'idle' | 'loading' | 'succeeded' | 'failed'; // For login/register
  error: string | null;    // For login/register

  forgotPasswordStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  forgotPasswordError: string | null;
  forgotPasswordMessage: string | null;

  resetPasswordStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  resetPasswordError: string | null;
  resetPasswordMessage: string | null;

  // New fields for profile management
  profileStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  profileError: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  status: 'idle',
  error: null,

  forgotPasswordStatus: 'idle',
  forgotPasswordError: null,
  forgotPasswordMessage: null,

  resetPasswordStatus: 'idle',
  resetPasswordError: null,
  resetPasswordMessage: null,

  profileStatus: 'idle',
  profileError: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.status = 'loading';
      state.error = null;
      state.profileStatus = 'idle'; // Reset profile status on new login attempt
      state.profileError = null;
    },
    loginSuccess(state, action: PayloadAction<LoginSuccessPayload>) {
      state.status = 'succeeded';
      state.isAuthenticated = true;
      state.user = action.payload.user; // User profile is set here
      state.accessToken = action.payload.tokens.accessToken;
      state.refreshToken = action.payload.tokens.refreshToken || null;
      state.profileStatus = 'succeeded'; // Profile is implicitly fetched on login
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'idle';
      state.error = null;
      state.forgotPasswordStatus = 'idle';
      state.forgotPasswordError = null;
      state.forgotPasswordMessage = null;
      state.resetPasswordStatus = 'idle';
      state.resetPasswordError = null;
      state.resetPasswordMessage = null;
      // Reset profile status on logout
      state.profileStatus = 'idle';
      state.profileError = null;
    },
    registerStart(state) {
      state.status = 'loading';
      state.error = null;
    },
    // Assuming registerSuccess might also log the user in or provide user data
    registerSuccess(state, action: PayloadAction<LoginSuccessPayload>) {
      state.status = 'succeeded';
      // Registration also logs in the user
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.tokens.accessToken;
      state.refreshToken = action.payload.tokens.refreshToken || null;
      state.profileStatus = 'succeeded';
    },
    registerFailure(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
    forgotPasswordStart(state) {
      state.forgotPasswordStatus = 'loading';
      state.forgotPasswordError = null;
      state.forgotPasswordMessage = null;
    },
    forgotPasswordSuccess(state, action: PayloadAction<string>) {
      state.forgotPasswordStatus = 'succeeded';
      state.forgotPasswordMessage = action.payload;
    },
    forgotPasswordFailure(state, action: PayloadAction<string>) {
      state.forgotPasswordStatus = 'failed';
      state.forgotPasswordError = action.payload;
    },
    resetPasswordStart(state) {
      state.resetPasswordStatus = 'loading';
      state.resetPasswordError = null;
      state.resetPasswordMessage = null;
    },
    resetPasswordSuccess(state, action: PayloadAction<string>) {
      state.resetPasswordStatus = 'succeeded';
      state.resetPasswordMessage = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'idle';
      state.error = null;
    },
    resetPasswordFailure(state, action: PayloadAction<string>) {
      state.resetPasswordStatus = 'failed';
      state.resetPasswordError = action.payload;
    },

    // New reducers for profile management
    fetchProfileStart(state) {
      state.profileStatus = 'loading';
      state.profileError = null;
    },
    fetchProfileSuccess(state, action: PayloadAction<UserData>) {
      state.profileStatus = 'succeeded';
      state.user = action.payload; // Update user profile in state
    },
    fetchProfileFailure(state, action: PayloadAction<string>) {
      state.profileStatus = 'failed';
      state.profileError = action.payload;
    },
    updateProfileStart(state) {
      state.profileStatus = 'loading';
      state.profileError = null;
    },
    updateProfileSuccess(state, action: PayloadAction<UserData>) {
      state.profileStatus = 'succeeded';
      state.user = action.payload; // Update user profile in state
    },
    updateProfileFailure(state, action: PayloadAction<string>) {
      state.profileStatus = 'failed';
      state.profileError = action.payload;
    },

    // Token refresh action
    refreshTokenSuccess(state, action: PayloadAction<{ accessToken: string }>) {
      state.accessToken = action.payload.accessToken;
    },
  },
});
export const {
  loginStart, loginSuccess, loginFailure,
  logout,
  registerStart, registerSuccess, registerFailure,
  forgotPasswordStart, forgotPasswordSuccess, forgotPasswordFailure,
  resetPasswordStart, resetPasswordSuccess, resetPasswordFailure,
  // Export new profile actions
  fetchProfileStart, fetchProfileSuccess, fetchProfileFailure,
  updateProfileStart, updateProfileSuccess, updateProfileFailure,
  refreshTokenSuccess
} = authSlice.actions;

export default authSlice.reducer;
