import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/config/constants';
import { deriveSellerFlags } from '@/utils/sellerStatus';

const withSellerFlags = (user: User): User => ({
  ...user,
  ...deriveSellerFlags(user),
});

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
      const user = withSellerFlags(action.payload.user);
      state.user = user;
      state.token = action.payload.token;
      state.isLoggedIn = true;
      storage.setObject(STORAGE_KEYS.USER, user);
    },

    setUser: (state, action: PayloadAction<User>) => {
      const user = withSellerFlags(action.payload);
      state.user = user;
      state.isLoggedIn = true;
      storage.setObject(STORAGE_KEYS.USER, user);
    },

    setHydrated: (
      state,
      action: PayloadAction<{
        user: User | null;
        token: string | null;
        hasOnboarded: boolean;
      }>,
    ) => {
      const user = action.payload.user
        ? withSellerFlags(action.payload.user)
        : null;
      state.user = user;
      state.token = action.payload.token;
      state.isLoggedIn = !!user && !!action.payload.token;
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
