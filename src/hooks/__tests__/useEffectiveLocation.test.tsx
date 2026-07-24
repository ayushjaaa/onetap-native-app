import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { createTestStore } from '@/test-utils/renderWithProviders';
import { RADIUS_DEFAULT_KM } from '@/config/constants';
import {
  setLocation,
  setBrowsingLocation,
  clearBrowsingLocation,
  setRealLocationRadiusKm,
  setBrowsingLocationRadiusKm,
  type LocationState,
} from '@/store/locationSlice';
import { useEffectiveLocation } from '@/hooks/useEffectiveLocation';

const REAL_LOCATION: LocationState = {
  latitude: 19.076,
  longitude: 72.8777,
  city: 'Mumbai',
  state: 'Maharashtra',
  address: 'Mumbai, Maharashtra, India',
  pincode: '400001',
};

const BROWSING_LOCATION: LocationState = {
  latitude: 22.7196,
  longitude: 75.8577,
  city: 'Indore',
  state: 'Madhya Pradesh',
  address: 'Indore, Madhya Pradesh, India',
  pincode: null,
};

// renderHook is async (see @testing-library/react-native's render-hook.js)
// — every caller must await it, or `result` destructures from an
// unresolved Promise instead of the real { result, rerender, unmount }.
function renderWithStore(store: ReturnType<typeof createTestStore>) {
  return renderHook(() => useEffectiveLocation(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
}

describe('useEffectiveLocation', () => {
  it('hasLocation is false with no real location and no override', async () => {
    const store = createTestStore();
    const { result } = await renderWithStore(store);

    expect(result.current.hasLocation).toBe(false);
    expect(result.current.isOverride).toBe(false);
    // Even with no coordinates yet, the radius preference itself must
    // still resolve to a sane default — a filter sheet opened before GPS
    // resolves shouldn't show radiusKm as undefined/NaN.
    expect(result.current.radiusKm).toBe(RADIUS_DEFAULT_KM);
  });

  it('returns the real location and realLocationRadiusKm when no override is set', async () => {
    const store = createTestStore();
    store.dispatch(setLocation(REAL_LOCATION));
    store.dispatch(setRealLocationRadiusKm(15));
    store.dispatch(setBrowsingLocationRadiusKm(180)); // must be ignored

    const { result } = await renderWithStore(store);

    expect(result.current.isOverride).toBe(false);
    expect(result.current.city).toBe('Mumbai');
    expect(result.current.latitude).toBe(REAL_LOCATION.latitude);
    expect(result.current.radiusKm).toBe(15);
  });

  it('prefers the browsing override location AND its own radius over the real one', async () => {
    const store = createTestStore();
    store.dispatch(setLocation(REAL_LOCATION));
    store.dispatch(setRealLocationRadiusKm(15));
    store.dispatch(setBrowsingLocation(BROWSING_LOCATION));
    store.dispatch(setBrowsingLocationRadiusKm(180));

    const { result } = await renderWithStore(store);

    expect(result.current.isOverride).toBe(true);
    // Must show Indore (the browsing city), never Mumbai (the real one),
    // while an override is active.
    expect(result.current.city).toBe('Indore');
    expect(result.current.latitude).toBe(BROWSING_LOCATION.latitude);
    // Must use the browsing radius (180), never the real-location radius
    // (15) — this is the core guarantee the two-radius design depends on.
    expect(result.current.radiusKm).toBe(180);
  });

  it('reverts to the real location and real radius after the override is cleared', async () => {
    const store = createTestStore();
    store.dispatch(setLocation(REAL_LOCATION));
    store.dispatch(setRealLocationRadiusKm(15));
    store.dispatch(setBrowsingLocation(BROWSING_LOCATION));
    store.dispatch(setBrowsingLocationRadiusKm(180));
    store.dispatch(clearBrowsingLocation());

    const { result } = await renderWithStore(store);

    expect(result.current.isOverride).toBe(false);
    expect(result.current.city).toBe('Mumbai');
    expect(result.current.radiusKm).toBe(15);
  });

  it('hasLocation reflects the override coordinates while one is active, not the real ones', async () => {
    const store = createTestStore();
    // Real location was never resolved (fresh install, GPS pending) —
    // hasLocation must still become true once a browsing override with
    // real coordinates is set, independent of the real GPS fix.
    store.dispatch(setBrowsingLocation(BROWSING_LOCATION));

    const { result } = await renderWithStore(store);

    expect(result.current.hasLocation).toBe(true);
    expect(result.current.latitude).toBe(BROWSING_LOCATION.latitude);
  });
});
