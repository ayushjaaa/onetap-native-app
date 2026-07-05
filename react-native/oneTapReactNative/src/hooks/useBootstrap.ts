import { useEffect, useState } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { secureStorage } from '@/services/secureStorage';
import { storage } from '@/services/storage';
import { googleAuth } from '@/services/googleAuth';
import { setHydrated } from '@/store/authSlice';
import { hydrateLocation } from '@/store/locationSlice';
import { authApi } from '@/api/authApi';
import { STORAGE_KEYS, SPLASH_MIN_DURATION_MS } from '@/config/constants';
import type { User } from '@/types';
import type { LocationState } from '@/store/locationSlice';

/**
 * Runs once on app launch.
 *  - Reads token from Keychain
 *  - Validates token via /auth/me (if present)
 *  - Hydrates Redux from MMKV (offline fallback)
 *  - Reads onboarding flag
 *  - Enforces minimum splash duration
 *
 * Returns `ready` once everything is hydrated.
 */
export const useBootstrap = (): { ready: boolean } => {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = Date.now();

    const run = async () => {
      try {
        // Idempotent — safe to run on every launch
        googleAuth.configure();

        const token = await secureStorage.getToken();
        const cachedUser = storage.getObject<User>(STORAGE_KEYS.USER);
        const hasOnboarded =
          storage.getBoolean(STORAGE_KEYS.HAS_ONBOARDED) ?? false;
        const cachedLocation = storage.getObject<LocationState>(
          STORAGE_KEYS.LAST_LOCATION,
        );

        let resolvedUser: User | null = cachedUser;

        if (token) {
          // Validate token with backend
          try {
            const result = await dispatch(
              authApi.endpoints.getMe.initiate(undefined, {
                forceRefetch: true,
              }),
            ).unwrap();
            resolvedUser = result.data.user;
          } catch (err) {
            // 401 → middleware already cleared. Network err → use cache.
            const status = (err as { status?: number })?.status;
            if (status === 401) {
              await secureStorage.clearToken();
              storage.remove(STORAGE_KEYS.USER);
              resolvedUser = null;
            }
            // else: keep cachedUser (offline mode)
          }
        }

        dispatch(
          setHydrated({
            user: resolvedUser,
            token: resolvedUser ? token : null,
            hasOnboarded,
          }),
        );

        if (cachedLocation) {
          dispatch(hydrateLocation(cachedLocation));
        }
      } finally {
        // Enforce minimum splash duration so user sees the animation
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, SPLASH_MIN_DURATION_MS - elapsed);
        setTimeout(() => setReady(true), remaining);
      }
    };

    run();
  }, [dispatch]);

  return { ready };
};
