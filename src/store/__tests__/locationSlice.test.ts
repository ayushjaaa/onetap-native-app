import { createTestStore } from '@/test-utils/renderWithProviders';
import { storage } from '@/services/storage';
import { STORAGE_KEYS, RADIUS_DEFAULT_KM } from '@/config/constants';
import {
  setLocation,
  clearLocation,
  setBrowsingLocation,
  clearBrowsingLocation,
  setRealLocationRadiusKm,
  setBrowsingLocationRadiusKm,
  hydrateRadiusPreferences,
  type LocationState,
} from '@/store/locationSlice';

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

describe('locationSlice', () => {
  it('defaults both radii to RADIUS_DEFAULT_KM and no browsing override on fresh state', () => {
    const store = createTestStore();
    const state = store.getState().location;
    expect(state.browsingLocation).toBeNull();
    expect(state.realLocationRadiusKm).toBe(RADIUS_DEFAULT_KM);
    expect(state.browsingLocationRadiusKm).toBe(RADIUS_DEFAULT_KM);
  });

  it('setBrowsingLocation does not touch the real location fields', () => {
    const store = createTestStore();
    store.dispatch(setLocation(REAL_LOCATION));
    store.dispatch(setBrowsingLocation(BROWSING_LOCATION));

    const state = store.getState().location;
    expect(state.latitude).toBe(REAL_LOCATION.latitude);
    expect(state.city).toBe(REAL_LOCATION.city);
    expect(state.browsingLocation).toEqual(BROWSING_LOCATION);
  });

  it('clearBrowsingLocation only clears the override, real location survives', () => {
    const store = createTestStore();
    store.dispatch(setLocation(REAL_LOCATION));
    store.dispatch(setBrowsingLocation(BROWSING_LOCATION));
    store.dispatch(clearBrowsingLocation());

    const state = store.getState().location;
    expect(state.browsingLocation).toBeNull();
    expect(state.latitude).toBe(REAL_LOCATION.latitude);
  });

  it('setRealLocationRadiusKm and setBrowsingLocationRadiusKm are independent — setting one never changes the other', () => {
    const store = createTestStore();
    store.dispatch(setRealLocationRadiusKm(10));
    let state = store.getState().location;
    expect(state.realLocationRadiusKm).toBe(10);
    expect(state.browsingLocationRadiusKm).toBe(RADIUS_DEFAULT_KM);

    store.dispatch(setBrowsingLocationRadiusKm(150));
    state = store.getState().location;
    // The real-location radius must still be 10, untouched by the
    // browsing-radius update — this is the whole point of having two
    // separate fields instead of one shared radius.
    expect(state.realLocationRadiusKm).toBe(10);
    expect(state.browsingLocationRadiusKm).toBe(150);
  });

  it('setRealLocationRadiusKm persists to REAL_LOCATION_RADIUS_KM, not the browsing key', () => {
    const store = createTestStore();
    store.dispatch(setRealLocationRadiusKm(77));

    expect(storage.getNumber(STORAGE_KEYS.REAL_LOCATION_RADIUS_KM)).toBe(77);
    expect(
      storage.getNumber(STORAGE_KEYS.BROWSING_LOCATION_RADIUS_KM),
    ).not.toBe(77);
  });

  it('setBrowsingLocationRadiusKm persists to BROWSING_LOCATION_RADIUS_KM, not the real key', () => {
    const store = createTestStore();
    store.dispatch(setBrowsingLocationRadiusKm(88));

    expect(storage.getNumber(STORAGE_KEYS.BROWSING_LOCATION_RADIUS_KM)).toBe(
      88,
    );
    expect(storage.getNumber(STORAGE_KEYS.REAL_LOCATION_RADIUS_KM)).not.toBe(
      88,
    );
  });

  it('hydrateRadiusPreferences with only one field set does not clobber the other', () => {
    const store = createTestStore();
    store.dispatch(setRealLocationRadiusKm(45));
    store.dispatch(setBrowsingLocationRadiusKm(60));

    // Simulates bootstrap reading only one persisted key back (e.g. the
    // other was never set on this device before) — must not reset the
    // already-hydrated field to undefined/default.
    store.dispatch(hydrateRadiusPreferences({ realLocationRadiusKm: 45 }));

    const state = store.getState().location;
    expect(state.realLocationRadiusKm).toBe(45);
    expect(state.browsingLocationRadiusKm).toBe(60);
  });

  it('clearLocation resets browsingLocation and both radii back to defaults', () => {
    const store = createTestStore();
    store.dispatch(setLocation(REAL_LOCATION));
    store.dispatch(setBrowsingLocation(BROWSING_LOCATION));
    store.dispatch(setRealLocationRadiusKm(5));
    store.dispatch(setBrowsingLocationRadiusKm(200));

    store.dispatch(clearLocation());

    const state = store.getState().location;
    expect(state.latitude).toBeNull();
    expect(state.browsingLocation).toBeNull();
    expect(state.realLocationRadiusKm).toBe(RADIUS_DEFAULT_KM);
    expect(state.browsingLocationRadiusKm).toBe(RADIUS_DEFAULT_KM);
  });
});
