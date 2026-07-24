import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  configureStore,
  Middleware,
  isRejectedWithValue,
} from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from '@/api/baseApi';
import authReducer, { logout } from '@/store/authSlice';
import locationReducer from '@/store/locationSlice';
import { secureStorage } from '@/services/secureStorage';

/**
 * Global 401 handler — auto-logout when any API call returns 401.
 * Token is cleared from Keychain and Redux state, navigator switches.
 *
 * Excludes the pre-signup onboarding endpoints (login/sendOtp/resendOtp/verifyOtp):
 * at that point the user was never dispatched into Redux via setCredentials, so
 * there's no session to "log out" of — wiping the just-saved Keychain token here
 * only turns a single transient 401 (e.g. a race between saveToken and the next
 * request) into a hard failure loop for the rest of the onboarding flow.
 */
const ONBOARDING_ENDPOINTS = new Set([
  'login',
  'sendOtp',
  'resendOtp',
  'verifyOtp',
]);

const authErrorMiddleware: Middleware = api => next => action => {
  if (isRejectedWithValue(action)) {
    const payload = action.payload as { status?: number } | undefined;
    const endpoint = (action as { meta?: { arg?: { endpointName?: string } } })
      .meta?.arg?.endpointName;
    if (payload?.status === 401 && !ONBOARDING_ENDPOINTS.has(endpoint ?? '')) {
      void secureStorage.clearToken();
      api.dispatch(logout());
    }
  }
  return next(action);
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    location: locationReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [],
      },
    })
      .concat(baseApi.middleware)
      .concat(authErrorMiddleware),
});

// RN has no window 'visibilitychange'/'online' events, so RTK Query's default
// setupListeners() is inert here (refetchOnFocus/refetchOnReconnect never fire)
// unless we bridge them via AppState + NetInfo ourselves.
setupListeners(
  store.dispatch,
  (dispatch, { onFocus, onFocusLost, onOnline, onOffline }) => {
    const appStateSub = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        dispatch(state === 'active' ? onFocus() : onFocusLost());
      },
    );
    const netInfoUnsub = NetInfo.addEventListener(netState => {
      dispatch(netState.isConnected ? onOnline() : onOffline());
    });

    return () => {
      appStateSub.remove();
      netInfoUnsub();
    };
  },
);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
