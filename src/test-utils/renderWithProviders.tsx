import React from 'react';
import type { ReactElement } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { baseApi } from '@/api/baseApi';
import authReducer from '@/store/authSlice';
import locationReducer from '@/store/locationSlice';

export function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      location: locationReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({ serializableCheck: false }).concat(
        baseApi.middleware,
      ),
  });
}

export async function renderWithProviders(
  ui: ReactElement,
  {
    store = createTestStore(),
  }: { store?: ReturnType<typeof createTestStore> } = {},
) {
  const result = await render(
    <Provider store={store}>
      <NavigationContainer>{ui}</NavigationContainer>
    </Provider>,
  );
  return { store, ...result };
}
