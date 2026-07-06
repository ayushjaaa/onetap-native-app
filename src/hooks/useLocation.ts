import { useCallback, useState } from 'react';
import {
  locationService,
  type ResolvedLocation,
} from '@/services/locationService';
import {
  requestLocationPermission,
  type PermissionResult,
} from '@/utils/permissions';

type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'fetching'
  | 'success'
  | 'permission_denied'
  | 'permission_blocked'
  | 'gps_off'
  | 'timeout'
  | 'error';

interface UseLocationResult {
  status: LocationStatus;
  location: ResolvedLocation | null;
  error: string | null;
  refining: boolean;
  fetch: () => Promise<ResolvedLocation | null>;
}

const MAX_ATTEMPTS = 2;

const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

const errorMessageFor = (
  code: number | undefined,
): {
  status: LocationStatus;
  message: string;
} => {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return {
        status: 'permission_denied',
        message: 'Location permission denied.',
      };
    case 2: // POSITION_UNAVAILABLE
      return {
        status: 'gps_off',
        message: 'GPS unavailable. Please enable location.',
      };
    case 3: // TIMEOUT
      return {
        status: 'timeout',
        message: 'Could not get location. Please try again.',
      };
    default:
      return {
        status: 'error',
        message: 'Failed to fetch location.',
      };
  }
};

export const useLocation = (): UseLocationResult => {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);

  // Best-effort high-accuracy refinement, run after we already have a fast
  // fix on screen. Never surfaces an error — the fast fix stands if this
  // fails or times out.
  const refine = useCallback(async () => {
    setRefining(true);
    try {
      const coords = await locationService.getCurrentPosition({
        highAccuracy: true,
      });
      const resolved = await locationService.reverseGeocode(coords);
      setLocation(resolved);
    } catch {
      // keep the fast fix
    } finally {
      setRefining(false);
    }
  }, []);

  const fetch = useCallback(async (): Promise<ResolvedLocation | null> => {
    setError(null);
    setStatus('requesting');

    const permission: PermissionResult = await requestLocationPermission();
    if (permission === 'denied') {
      setStatus('permission_denied');
      setError('Location permission is required to continue.');
      return null;
    }
    if (permission === 'blocked') {
      setStatus('permission_blocked');
      setError(
        'Location permission is blocked. Please enable it from Settings.',
      );
      return null;
    }

    setStatus('fetching');

    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        // Fast, low-accuracy fix first so the UI isn't blocked on a cold
        // GPS lock. High-accuracy refinement happens in the background.
        const coords = await locationService.getCurrentPosition({
          highAccuracy: false,
        });
        const resolved = await locationService.reverseGeocode(coords);
        setLocation(resolved);
        setStatus('success');
        void refine();
        return resolved;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_ATTEMPTS) {
          await delay(800);
        }
      }
    }

    const code = (lastErr as { code?: number })?.code;
    const mapped = errorMessageFor(code);
    setStatus(mapped.status);
    setError(mapped.message);
    return null;
  }, [refine]);

  return { status, location, error, refining, fetch };
};
