import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  user: { name: string; email: string } | null;
  token: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  status: 'idle',
  error: null,
};

// Placeholder for user data and token types for actions
interface UserData {
  name: string;
  email: string;
}

interface LoginSuccessPayload {
  user: UserData;
  token: string;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.status = 'loading';
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<LoginSuccessPayload>) {
      state.status = 'succeeded';
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
    },
    registerStart(state) {
      state.status = 'loading';
      state.error = null;
    },
    registerSuccess(state, action: PayloadAction<LoginSuccessPayload>) { // Assuming register also returns user and token
      state.status = 'succeeded';
      state.isAuthenticated = true; // Or false, depending on if email verification is needed
      state.user = action.payload.user;
      state.token = action.payload.token; // Or null
    },
    registerFailure(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
  },
});

export const {
  loginStart, loginSuccess, loginFailure,
  logout,
  registerStart, registerSuccess, registerFailure
} = authSlice.actions;

export default authSlice.reducer;
