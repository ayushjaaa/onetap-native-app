import { useEffect, useState } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { secureStorage } from '@/services/secureStorage';
import { storage } from '@/services/storage';
import { googleAuth } from '@/services/googleAuth';
import { setHydrated } from '@/store/authSlice';
import {
  hydrateLocation,
  hydrateRadiusPreferences,
} from '@/store/locationSlice';
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
        const cachedRealRadiusKm = storage.getNumber(
          STORAGE_KEYS.REAL_LOCATION_RADIUS_KM,
        );
        const cachedBrowsingRadiusKm = storage.getNumber(
          STORAGE_KEYS.BROWSING_LOCATION_RADIUS_KM,
        );

        let resolvedUser: User | null = cachedUser;

        if (token) {
          // Validate token with backend. This dispatch creates a standing
          // RTK Query subscription (tagged 'User') that outlives this one-off
          // boot check unless explicitly unsubscribed — left subscribed, it
          // gets auto-refetched by any later invalidatesTags: ['User'] (e.g.
          // the login mutation), using whatever token happens to be in
          // Keychain at that moment. That race lost against a fresh login's
          // saveToken() and produced a spurious 401 that authErrorMiddleware
          // treated as real, wiping the just-saved token before the OTP
          // screen could use it. Unsubscribing once this check is done
          // prevents it from being resurrected later.
          const query = dispatch(
            authApi.endpoints.getMe.initiate(undefined, {
              forceRefetch: true,
            }),
          );
          try {
            const result = await query.unwrap();
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
          } finally {
            query.unsubscribe();
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
        if (cachedRealRadiusKm != null || cachedBrowsingRadiusKm != null) {
          dispatch(
            hydrateRadiusPreferences({
              realLocationRadiusKm: cachedRealRadiusKm,
              browsingLocationRadiusKm: cachedBrowsingRadiusKm,
            }),
          );
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
