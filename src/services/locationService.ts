import Geolocation from '@react-native-community/geolocation';

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
};
