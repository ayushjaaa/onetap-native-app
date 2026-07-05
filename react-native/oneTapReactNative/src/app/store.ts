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
 */
const authErrorMiddleware: Middleware = api => next => action => {
  if (isRejectedWithValue(action)) {
    const payload = action.payload as { status?: number } | undefined;
    if (payload?.status === 401) {
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

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
