import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { env } from '@/config/env';
import { secureStorage } from '@/services/secureStorage';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.API_URL,
  timeout: 15000,
  prepareHeaders: async headers => {
    const token = await secureStorage.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    return headers;
  },
});

/**
 * Base query wrapper. Centralized place to add cross-cutting concerns
 * like 401 auto-logout, retries, refresh-token logic in the future.
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  // Hook for 401 auto-logout — implemented when authSlice is wired in store.
  // The middleware in store.ts listens for 401s globally and dispatches logout.

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Product', 'Service', 'Property', 'Wallet', 'Chat'],
  endpoints: () => ({}),
});
