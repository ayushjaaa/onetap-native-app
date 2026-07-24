import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { storage } from '@/services/storage';
import { STORAGE_KEYS, RADIUS_DEFAULT_KM } from '@/config/constants';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  address: string | null;
  pincode: string | null;
}

// Temporary "browse this city instead" override (e.g. searching "Indore"
// while physically elsewhere) — deliberately Redux-only, never persisted to
// MMKV, so it resets to the real GPS location on every fresh app launch.
export interface LocationSliceState extends LocationState {
  browsingLocation: LocationState | null;
  // Two independent search-radius preferences (km) — one for real-GPS
  // "near me" browsing, one for city-search browsing. Unlike
  // browsingLocation itself, these ARE persisted: they're lasting user
  // preferences ("how far do I want to look"), not a temporary session
  // override, so they survive app restarts same as the real location does.
  realLocationRadiusKm: number;
  browsingLocationRadiusKm: number;
}

const initialState: LocationSliceState = {
  latitude: null,
  longitude: null,
  city: null,
  state: null,
  address: null,
  pincode: null,
  browsingLocation: null,
  realLocationRadiusKm: RADIUS_DEFAULT_KM,
  browsingLocationRadiusKm: RADIUS_DEFAULT_KM,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocation: (state, action: PayloadAction<LocationState>) => {
      Object.assign(state, action.payload);
      storage.setObject(STORAGE_KEYS.LAST_LOCATION, action.payload);
    },
    hydrateLocation: (state, action: PayloadAction<LocationState>) => {
      Object.assign(state, action.payload);
    },
    clearLocation: state => {
      Object.assign(state, initialState);
      storage.remove(STORAGE_KEYS.LAST_LOCATION);
    },
    setBrowsingLocation: (state, action: PayloadAction<LocationState>) => {
      state.browsingLocation = action.payload;
    },
    clearBrowsingLocation: state => {
      state.browsingLocation = null;
    },
    setRealLocationRadiusKm: (state, action: PayloadAction<number>) => {
      state.realLocationRadiusKm = action.payload;
      storage.setNumber(STORAGE_KEYS.REAL_LOCATION_RADIUS_KM, action.payload);
    },
    setBrowsingLocationRadiusKm: (state, action: PayloadAction<number>) => {
      state.browsingLocationRadiusKm = action.payload;
      storage.setNumber(
        STORAGE_KEYS.BROWSING_LOCATION_RADIUS_KM,
        action.payload,
      );
    },
    hydrateRadiusPreferences: (
      state,
      action: PayloadAction<{
        realLocationRadiusKm?: number;
        browsingLocationRadiusKm?: number;
      }>,
    ) => {
      if (action.payload.realLocationRadiusKm != null) {
        state.realLocationRadiusKm = action.payload.realLocationRadiusKm;
      }
      if (action.payload.browsingLocationRadiusKm != null) {
        state.browsingLocationRadiusKm =
          action.payload.browsingLocationRadiusKm;
      }
    },
  },
});

export const {
  setLocation,
  hydrateLocation,
  clearLocation,
  setBrowsingLocation,
  clearBrowsingLocation,
  setRealLocationRadiusKm,
  setBrowsingLocationRadiusKm,
  hydrateRadiusPreferences,
} = locationSlice.actions;

export default locationSlice.reducer;
