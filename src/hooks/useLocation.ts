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
  fetch: () => Promise<ResolvedLocation | null>;
}

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
    try {
      const coords = await locationService.getCurrentPosition();
      const resolved = await locationService.reverseGeocode(coords);
      setLocation(resolved);
      setStatus('success');
      return resolved;
    } catch (err) {
      const code = (err as { code?: number })?.code;
      const mapped = errorMessageFor(code);
      setStatus(mapped.status);
      setError(mapped.message);
      return null;
    }
  }, []);

  return { status, location, error, fetch };
};
