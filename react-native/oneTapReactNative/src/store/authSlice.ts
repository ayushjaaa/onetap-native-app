import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/config/constants';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  hasOnboarded: boolean;
  isHydrated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoggedIn: false,
  hasOnboarded: false,
  isHydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoggedIn = true;
      storage.setObject(STORAGE_KEYS.USER, action.payload.user);
    },

    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isLoggedIn = true;
      storage.setObject(STORAGE_KEYS.USER, action.payload);
    },

    setHydrated: (
      state,
      action: PayloadAction<{
        user: User | null;
        token: string | null;
        hasOnboarded: boolean;
      }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoggedIn = !!action.payload.user && !!action.payload.token;
      state.hasOnboarded = action.payload.hasOnboarded;
      state.isHydrated = true;
    },

    completeOnboarding: state => {
      state.hasOnboarded = true;
      storage.setBoolean(STORAGE_KEYS.HAS_ONBOARDED, true);
    },

    logout: state => {
      state.user = null;
      state.token = null;
      state.isLoggedIn = false;
      storage.remove(STORAGE_KEYS.USER);
    },
  },
});

export const {
  setCredentials,
  setUser,
  setHydrated,
  completeOnboarding,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
