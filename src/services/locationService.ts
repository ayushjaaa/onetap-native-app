import Geolocation from 'react-native-geolocation-service';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ResolvedLocation extends Coordinates {
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
}

export interface CitySearchResult {
  displayName: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
}

export const locationService = {
  /**
   * Get current GPS coordinates. Caller must ensure permission is granted.
   *
   * `highAccuracy: false` (default) asks the device for a quick network/
   * cell-based fix — resolves in ~1-2s and is what most apps show first.
   * `highAccuracy: true` asks for a real GPS fix, which can take much
   * longer (or never resolve) on a cold GPS chip indoors, so callers doing
   * a two-phase fetch should use a longer timeout for that pass.
   */
  getCurrentPosition: (options?: {
    highAccuracy?: boolean;
    timeout?: number;
  }): Promise<Coordinates> => {
    const highAccuracy = options?.highAccuracy ?? false;
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => reject(error),
        {
          enableHighAccuracy: highAccuracy,
          // Without this, the library defaults to auto-launching Android's
          // native "Enable Location" system dialog when GPS is off — that
          // dialog isn't ours to control and looks indistinguishable from
          // the app abruptly exiting. Disabling it makes the call fail with
          // error code 2 (POSITION_UNAVAILABLE) instead, which useLocation
          // already maps to 'gps_off' and surfaces via our own in-app Alert.
          showLocationDialog: false,
          // Default (false) routes through Google Play Services' Fused
          // Location Provider, which can itself bounce the user to the Play
          // Store (missing/outdated Play Services) or run its own settings-
          // resolution flow — both entirely outside our JS error handling,
          // and both look identical to "the app just exited". Forcing
          // Android's plain LocationManager keeps every failure path inside
          // our own try/catch → 'gps_off'/'error' states above.
          forceLocationManager: true,
          timeout: options?.timeout ?? (highAccuracy ? 15000 : 5000),
          maximumAge: highAccuracy ? 0 : 60000,
        },
      );
    });
  },

  /**
   * Reverse-geocode lat/lng to a human-readable address using Nominatim
   * (OpenStreetMap). No API key required. Replace with Google Geocoding
   * API for production-grade accuracy.
   */
  reverseGeocode: async (coords: Coordinates): Promise<ResolvedLocation> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OneTap365-App/1.0' },
      });
      if (!res.ok) throw new Error('Reverse geocoding failed');
      const data: {
        display_name?: string;
        address?: {
          city?: string;
          town?: string;
          village?: string;
          state?: string;
          postcode?: string;
        };
      } = await res.json();

      return {
        ...coords,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        address: data.display_name,
        pincode: data.address?.postcode,
      };
    } catch {
      return coords;
    }
  },

  /**
   * Forward-geocode a free-text place name (e.g. "Indore") to a list of
   * matching places, using the same Nominatim service as reverseGeocode.
   * Unlike reverseGeocode, network failures are rethrown here — the caller
   * (a search UI) needs to distinguish "no matches" from "request failed"
   * to show the right message.
   */
  searchCityByName: async (query: string): Promise<CitySearchResult[]> => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed,
    )}&countrycodes=in&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OneTap365-App/1.0' },
    });
    if (!res.ok) throw new Error('City search failed');

    const data: Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
      };
    }> = await res.json();

    return data.map(item => ({
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      city: item.address?.city || item.address?.town || item.address?.village,
      state: item.address?.state,
    }));
  },
};
