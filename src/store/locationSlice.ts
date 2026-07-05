import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/config/constants';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  address: string | null;
  pincode: string | null;
}

const initialState: LocationState = {
  latitude: null,
  longitude: null,
  city: null,
  state: null,
  address: null,
  pincode: null,
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
  },
});

export const { setLocation, hydrateLocation, clearLocation } =
  locationSlice.actions;

export default locationSlice.reducer;
